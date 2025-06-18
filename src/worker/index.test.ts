// src/worker/index.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import workerApp from './index'; // Assuming default export from index.ts is the Hono app
import { Env } from './index'; // Import Env type
import bcrypt from 'bcryptjs';

// Mock D1 Database for all tests in this file
const mockDb = {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
};

// Mock environment for the worker
const mockEnv = {
    DB: mockDb,
} as unknown as Env;

// Helper to make requests to the Hono app
const request = async (path: string, method: string = 'GET', body?: object, headers?: HeadersInit) => {
    const req = new Request(`http://localhost${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
    });
    // Simulate the execution context for the worker
    const executionContext = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
    return workerApp.fetch(req, mockEnv, executionContext);
};


describe('Worker API Tests', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.restoreAllMocks();
        // Re-mock D1 prepare chain for each test
        mockDb.prepare.mockImplementation(vi.fn().mockReturnThis());
        mockDb.bind.mockImplementation(vi.fn().mockReturnThis());
        // Ensure specific mocks like `first`, `all`, `run` are reset if they have specific implementations per test
        mockDb.first.mockReset();
        mockDb.all.mockReset();
        mockDb.run.mockReset();
    });

    describe('User Registration (/api/users/register)', () => {
        it('should register a new user successfully', async () => {
            mockDb.first.mockResolvedValueOnce(null); // No existing user
            mockDb.run.mockResolvedValueOnce({ success: true }); // DB insert success

            const response = await request('/api/users/register', 'POST', { email: 'test@example.com', password: 'password123' });
            const json = await response.json<{ id: string; email: string }>();

            expect(response.status).toBe(201);
            expect(json.email).toBe('test@example.com');
            expect(json.id).toBeDefined();
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO Users'));
        });

        it('should return 409 if user already exists', async () => {
            mockDb.first.mockResolvedValueOnce({ id: 'existing_user_id' }); // User exists

            const response = await request('/api/users/register', 'POST', { email: 'test@example.com', password: 'password123' });
            expect(response.status).toBe(409);
            const json = await response.json<{ error: string }>();
            expect(json.error).toBe('User with this email already exists');
        });
         it('should return 400 if password is too short', async () => {
            const response = await request('/api/users/register', 'POST', { email: 'test@example.com', password: '123' });
            expect(response.status).toBe(400);
        });
    });

    describe('User Login (/api/users/login)', () => {
        it('should login an existing user and return a token', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            // Mock for fetching user by email
            mockDb.prepare.mockImplementationOnce(() => mockDb); // For Users SELECT
            mockDb.bind.mockImplementationOnce(() => mockDb);
            mockDb.first.mockResolvedValueOnce({ id: 'user1', email: 'test@example.com', password_hash: hashedPassword });

            // Mock for inserting session
            mockDb.prepare.mockImplementationOnce(() => mockDb); // For UserSessions INSERT
            mockDb.bind.mockImplementationOnce(() => mockDb);
            mockDb.run.mockResolvedValueOnce({ success: true });

            const response = await request('/api/users/login', 'POST', { email: 'test@example.com', password: 'password123' });
            const json = await response.json<{ token: string }>();

            expect(response.status).toBe(200);
            expect(json.token).toBeDefined();
            // More specific checks on prepare calls
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT id, email, password_hash FROM Users WHERE email = ?'));
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO UserSessions'));
        });

        it('should return 401 for invalid credentials (user not found)', async () => {
            mockDb.first.mockResolvedValueOnce(null); // User not found
            const response = await request('/api/users/login', 'POST', { email: 'test@example.com', password: 'password123' });
            expect(response.status).toBe(401);
        });

        it('should return 401 for invalid credentials (wrong password)', async () => {
             mockDb.first.mockResolvedValueOnce({ id: 'user1', email: 'test@example.com', password_hash: await bcrypt.hash('wrongpassword',10) });
             const response = await request('/api/users/login', 'POST', { email: 'test@example.com', password: 'password123' });
             expect(response.status).toBe(401);
        });
    });

    describe('Domain Creation (/api/domains)', () => {
        it('should create a domain for an authenticated user', async () => {
            const validToken = 'valid_session_token';
            const userId = 'user123';

            // This setup is tricky due to multiple DB calls originating from one request.
            // We need to ensure mocks are consumed in the correct order.

            // 1. Auth middleware: UserSessions SELECT
            mockDb.prepare.mockImplementationOnce((query: string) => { // For UserSessions SELECT
                expect(query).toContain('UserSessions');
                return mockDb;
            });
            mockDb.bind.mockImplementationOnce(() => mockDb); // For UserSessions bind
            mockDb.first.mockResolvedValueOnce({ user_id: userId }); // Auth success

            // 2. Domain creation logic: Domains SELECT (check if exists)
            mockDb.prepare.mockImplementationOnce((query: string) => { // For Domains SELECT (check existing)
                 expect(query).toContain('SELECT id FROM Domains WHERE user_id = ? AND fqdn = ?');
                 return mockDb;
            });
            mockDb.bind.mockImplementationOnce(() => mockDb); // For Domains SELECT bind
            mockDb.first.mockResolvedValueOnce(null); // No existing domain

            // 3. Domain creation logic: Domains INSERT
            mockDb.prepare.mockImplementationOnce((query: string) => { // For Domains INSERT
                 expect(query).toContain('INSERT INTO Domains');
                 return mockDb;
            });
            mockDb.bind.mockImplementationOnce(() => mockDb); // For Domains INSERT bind
            mockDb.run.mockResolvedValueOnce({ success: true }); // Insert success

            // 4. Domain creation logic: Domains SELECT (fetch newly created)
            mockDb.prepare.mockImplementationOnce((query: string) => { // For Domains SELECT (fetch new)
                 expect(query).toContain('SELECT * FROM Domains WHERE id = ?');
                 return mockDb;
            });
            mockDb.bind.mockImplementationOnce(() => mockDb); // For Domains SELECT bind
            mockDb.first.mockResolvedValueOnce({ id: 'domain1', fqdn: 'newdomain.com', user_id: userId, status: 'pending_validation', created_at: '', updated_at: '' });


            const response = await request(
                '/api/domains',
                'POST',
                { fqdn: 'newdomain.com' },
                { 'Authorization': `Bearer ${validToken}` }
            );
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(json.fqdn).toBe('newdomain.com');
            expect(json.user_id).toBe(userId);
        });

        it('should return 401 if no auth token is provided', async () => {
            const response = await request('/api/domains', 'POST', { fqdn: 'newdomain.com' });
            expect(response.status).toBe(401);
        });
    });
});
