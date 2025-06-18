import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import bcrypt from 'bcryptjs';
import { issueCertificateForDomain } from './acmeService'; // ACME Service
import { toD1ISOString } from './utils'; // General utils including toD1ISOString

export interface Env {
    DB: D1Database;
    // Add other environment variables if needed, e.g., for ACME configuration
    // ACME_DIRECTORY_URL: string;
    // ACME_ACCOUNT_EMAIL: string;
}

const app = new Hono<{ Bindings: Env }>();

const generateId = () => crypto.randomUUID();
const generateToken = () => crypto.randomUUID() + crypto.randomUUID();

// --- Authentication Middleware ---
// Verifies a bearer token from the Authorization header against UserSessions in the D1 database.
const authMiddleware = bearerAuth({
    verifyToken: async (token, c) => {
        try {
            const now = toD1ISOString(new Date());
            const sessionQuery = 'SELECT user_id FROM UserSessions WHERE token = ? AND expires_at > ?';
            const session = await c.env.DB.prepare(sessionQuery).bind(token, now).first<{ user_id: string }>();

            if (session && session.user_id) {
                return { userId: session.user_id }; // Payload available as c.var.user
            }
            return undefined;
        } catch (e) {
            console.error("Token verification error:", e);
            return undefined;
        }
    }
});

// --- ACME HTTP-01 Challenge Route ---
// Handles /.well-known/acme-challenge/:token requests from ACME CAs (e.g., Let's Encrypt)
// This route must be publicly accessible and is NOT protected by authMiddleware.
app.get('/.well-known/acme-challenge/:token', async (c) => {
    const token = c.req.param('token');
    if (!token) {
        return c.text('Token not provided', 400);
    }
    try {
        const challenge = await c.env.DB.prepare(
            'SELECT content FROM AcmeHttpChallenges WHERE token = ? AND expires_at > ?'
        ).bind(token, toD1ISOString(new Date())).first<{ content: string }>();

        if (challenge && challenge.content) {
            return c.text(challenge.content);
        }
        return c.text('Challenge not found or expired', 404);
    } catch (e: any) {
        console.error('ACME Challenge lookup error:', e);
        return c.text('Error processing challenge', 500);
    }
});

// --- User Endpoints ---
// Publicly accessible endpoints for user registration and login.
app.post('/api/users/register', async (c) => {
    try {
        const { email, password } = await c.req.json<{ email: string, password: string }>();
        if (!email || !password) return c.json({ error: 'Email and password are required' }, 400);
        if (password.length < 8) return c.json({ error: 'Password must be at least 8 characters long' }, 400);

        const existingUser = await c.env.DB.prepare('SELECT id FROM Users WHERE email = ?').bind(email).first();
        if (existingUser) return c.json({ error: 'User with this email already exists' }, 409);

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = generateId();

        await c.env.DB.prepare('INSERT INTO Users (id, email, password_hash) VALUES (?, ?, ?)')
            .bind(userId, email, hashedPassword)
            .run();
        return c.json({ id: userId, email: email }, 201);
    } catch (e: any) {
        console.error('Registration error:', e);
        return c.json({ error: 'Failed to register user', details: e.message }, 500);
    }
});

app.post('/api/users/login', async (c) => {
    try {
        const { email, password } = await c.req.json<{ email: string, password: string }>();
        if (!email || !password) return c.json({ error: 'Email and password are required' }, 400);

        const user = await c.env.DB.prepare('SELECT id, email, password_hash FROM Users WHERE email = ?')
            .bind(email)
            .first<{ id: string, email: string, password_hash: string }>();

        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const token = generateToken();
        const sessionId = generateId();
        const expiresAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const expiresAtD1String = toD1ISOString(expiresAtDate);

        await c.env.DB.prepare('INSERT INTO UserSessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
            .bind(sessionId, user.id, token, expiresAtD1String)
            .run();
        return c.json({ token: token, userId: user.id, email: user.email });
    } catch (e: any) {
        console.error('Login error:', e);
        return c.json({ error: 'Failed to login', details: e.message }, 500);
    }
});

// --- Domain and Certificate Endpoints (Protected) ---
// These routes handle domain management and certificate operations.
// All routes under '/api/domains' are protected by the authMiddleware.
const domainRoutes = new Hono<{ Bindings: Env }>();
domainRoutes.use('*', authMiddleware); // Apply auth to all routes in this sub-router

// Helper function to extract userId from the context variable set by authMiddleware.
const getAuthenticatedUserId = (c: any) : string | undefined => {
  const userPayload = c.var.user;
  if (userPayload && typeof userPayload === 'object' && 'userId' in userPayload && typeof userPayload.userId === 'string') {
    return userPayload.userId;
  }
  return undefined;
};

// CRUD for Domains
domainRoutes.post('/', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized. Valid token required.' }, 401);
    try {
        const { fqdn } = await c.req.json<{ fqdn: string }>();
        const trimmedFqdn = fqdn?.trim();
        if (!trimmedFqdn || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedFqdn)) {
             return c.json({ error: 'Valid FQDN is required' }, 400);
        }
        const existingDomain = await c.env.DB.prepare('SELECT id FROM Domains WHERE user_id = ? AND fqdn = ?')
            .bind(userId, trimmedFqdn).first();
        if (existingDomain) return c.json({ error: 'Domain already added' }, 409);

        const domainId = generateId();
        const nowD1String = toD1ISOString(new Date());
        await c.env.DB.prepare('INSERT INTO Domains (id, user_id, fqdn, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            .bind(domainId, userId, trimmedFqdn, nowD1String, nowD1String).run();
        const newDomain = await c.env.DB.prepare('SELECT * FROM Domains WHERE id = ?').bind(domainId).first();
        return c.json(newDomain, 201);
    } catch (e: any) {
        console.error('Add domain error:', e);
        return c.json({ error: 'Failed to add domain', details: e.message }, 500);
    }
});

domainRoutes.get('/', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    try {
        const { results } = await c.env.DB.prepare('SELECT * FROM Domains WHERE user_id = ? ORDER BY created_at DESC')
            .bind(userId).all();
        return c.json(results ?? []);
    } catch (e: any) {
        console.error('List domains error:', e);
        return c.json({ error: 'Failed to list domains', details: e.message }, 500);
    }
});

domainRoutes.get('/:id', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const domainId = c.req.param('id');
    try {
        const domain = await c.env.DB.prepare('SELECT * FROM Domains WHERE id = ? AND user_id = ?')
            .bind(domainId, userId).first();
        if (!domain) return c.json({ error: 'Domain not found or access denied' }, 404);
        return c.json(domain);
    } catch (e: any) {
        console.error('Get domain error:', e);
        return c.json({ error: 'Failed to retrieve domain', details: e.message }, 500);
    }
});

domainRoutes.delete('/:id', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const domainId = c.req.param('id');
    try {
        const domainCheck = await c.env.DB.prepare('SELECT id FROM Domains WHERE id = ? AND user_id = ?')
            .bind(domainId, userId).first();
        if (!domainCheck) return c.json({ error: 'Domain not found or access denied' }, 404);
        await c.env.DB.prepare('DELETE FROM Domains WHERE id = ? AND user_id = ?')
            .bind(domainId, userId).run();
        return c.json({ message: 'Domain deleted successfully' });
    } catch (e: any) {
        console.error('Delete domain error:', e);
        return c.json({ error: 'Failed to delete domain', details: e.message }, 500);
    }
});

// Certificate Issuance Endpoint (under domains/:domainId)
domainRoutes.post('/:domainId/issue-certificate', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized. Valid token required.' }, 401);

    const domainId = c.req.param('domainId');
    if (!domainId) return c.json({ error: 'Domain ID is required.' }, 400);

    try {
        const domainInfo = await c.env.DB.prepare('SELECT fqdn FROM Domains WHERE id = ? AND user_id = ?')
            .bind(domainId, userId).first<{ fqdn: string }>();
        if (!domainInfo || !domainInfo.fqdn) {
            return c.json({ error: 'Domain not found or access denied.' }, 404);
        }

        const result = await issueCertificateForDomain(domainInfo.fqdn, c.env.DB, userId, domainId, c.env);
        if (result.success) {
            return c.json({ message: result.message, certificateId: result.certificateId }, 201);
        } else {
            return c.json({ error: result.message, details: result.error?.message }, 500);
        }
    } catch (e: any) {
        console.error('Certificate Issuance API Error:', e);
        return c.json({ error: 'Failed to issue certificate due to an internal error.', details: e.message }, 500);
    }
});

// List Certificates for a Domain
domainRoutes.get('/:domainId/certificates', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const domainId = c.req.param('domainId');

    try {
        // First, verify the user owns the domain
        const domainOwnerCheck = await c.env.DB.prepare('SELECT id FROM Domains WHERE id = ? AND user_id = ?')
            .bind(domainId, userId)
            .first();

        if (!domainOwnerCheck) {
            return c.json({ error: 'Domain not found or access denied' }, 404);
        }

        const { results } = await c.env.DB.prepare(
            'SELECT id, common_name, issued_at, expires_at, status FROM Certificates WHERE domain_id = ? AND user_id = ? ORDER BY created_at DESC'
        )
        .bind(domainId, userId)
        .all();

        return c.json(results ?? []);
    } catch (e: any) {
        console.error('List certificates error:', e);
        return c.json({ error: 'Failed to list certificates', details: e.message }, 500);
    }
});

// Mount the domain-specific routes under /api/domains
app.route('/api/domains', domainRoutes);

// --- Discovery Endpoints (Protected) ---
// Placeholder routes for future certificate discovery features.
// All routes under '/api/discovery' are protected by the authMiddleware.
const discoveryRoutes = new Hono<{ Bindings: Env }>();
discoveryRoutes.use('*', authMiddleware); // Apply auth to all routes

// POST /api/discovery/start
discoveryRoutes.post('/start', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    // const discoveryService = new DiscoveryService(c.env); // Future use
    // const { domainsToScan } = await c.req.json<{ domainsToScan?: string[] }>().catch(() => ({}));
    // const result = await discoveryService.startDiscovery(userId, domainsToScan);
    // return c.json(result);
    return c.json({ message: 'Certificate discovery process initiated (Placeholder - Not Implemented)', userId });
});

// GET /api/discovery/results
discoveryRoutes.get('/results', async (c) => {
    const userId = getAuthenticatedUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    // const discoveryService = new DiscoveryService(c.env); // Future use
    // const results = await discoveryService.getDiscoveryResults(userId);
    // return c.json({ results });

    // Mock data as per plan:
    const mockResults = [
        {
            id: 'disc_cert_1',
            fqdn: 'example.com',
            issuer_common_name: 'Mock CA',
            not_after: toD1ISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
            discovery_source: 'mock_scan',
            status: 'active'
        },
        {
            id: 'disc_cert_2',
            fqdn: 'another-example.net',
            issuer_common_name: 'Another Mock CA',
            not_after: toD1ISOString(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)), // Expired 10 days ago
            discovery_source: 'mock_scan',
            status: 'expired'
        }
    ];
    return c.json({ results: mockResults });
});

app.route('/api/discovery', discoveryRoutes);


// --- General App Routes ---
// Root path
app.get('/', (c) => c.text('Certificate Manager API is running!'));

// Error handler for the entire application
app.onError((err, c) => {
    console.error(`Global Error: ${err.message}`, err.stack); // Log stack for better debugging
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Not Found handler for the entire application
app.notFound((c) => c.json({ error: 'Not Found', message: `The path ${c.req.url} was not found.` }, 404));

// Export the Hono app for the Cloudflare Worker
export default {
    fetch: app.fetch,
};
