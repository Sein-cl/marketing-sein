// src/worker/acmeService.ts

// IMPORTANT SECURITY NOTE:
// Storing cryptographic private keys (ACME account keys, certificate private keys) directly
// in a database in plain text is a significant security risk, especially in production.
// For production systems, always use a secure secrets management solution like Cloudflare Secrets,
// HashiCorp Vault, AWS KMS, or Google Cloud KMS to store and manage sensitive key material.
// The approach used here with D1 is for demonstration and development purposes ONLY.

import * as acme from 'acme-client';
import { Env } from './index'; // Assuming Env is exported from index.ts
import { toD1ISOString, cryptoKeyToPkcs8Pem } from './utils';

const LE_STAGING_URL = 'https://acme-staging-v02.api.letsencrypt.org/directory';
const LE_PRODUCTION_URL = 'https://acme-v02.api.letsencrypt.org/directory'; // Keep for future use
// It's crucial to make this configurable and not hardcode it, e.g., via Worker environment variables.
const ACME_ACCOUNT_EMAIL = 'dev-test-email@example.com'; // <<< --- IMPORTANT: Replace with a valid email or make configurable
const ACME_ACCOUNT_ID = 'default_acme_account_v1'; // Identifier for the D1 AcmeAccounts table row

/**
 * Retrieves an existing ACME account private key from D1 or creates a new one,
 * then registers the account with the ACME CA (if new) and returns an initialized acme.Client.
 * @param db D1Database instance
 * @param env Worker environment variables
 * @returns Initialized acme.Client
 */
async function getOrCreateAcmeClient(db: D1Database, env: Env): Promise<acme.Client> {
    let accountKeyJwk: crypto.JsonWebKey | undefined;
    let accountUrl: string | undefined; // Stores the ACME account URL

    const existingAccount = await db.prepare('SELECT private_key_jwk, account_url FROM AcmeAccounts WHERE id = ?')
        .bind(ACME_ACCOUNT_ID).first<{ private_key_jwk: string, account_url: string }>();

    if (existingAccount && existingAccount.private_key_jwk) {
        accountKeyJwk = JSON.parse(existingAccount.private_key_jwk);
        accountUrl = existingAccount.account_url;
    } else {
        const newAccountKey = await acme.crypto.createRsaPrivateKey(); // Creates a CryptoKey
        accountKeyJwk = await acme.crypto.exportJwk(newAccountKey); // Exporting the private key in JWK format

        // Temporarily create client with new key to register account
        const tempClient = new acme.Client({
            directoryUrl: LE_STAGING_URL, // Use env.ACME_DIRECTORY_URL or similar in prod
            accountKey: newAccountKey, // Pass the CryptoKey directly
        });

        const createdAccount = await tempClient.createAccount({
            termsOfServiceAgreed: true,
            contact: [`mailto:${ACME_ACCOUNT_EMAIL}`] // Use env.ACME_ACCOUNT_EMAIL
        });
        accountUrl = createdAccount.url;

        await db.prepare('INSERT INTO AcmeAccounts (id, email, private_key_jwk, account_url) VALUES (?, ?, ?, ?)')
            .bind(ACME_ACCOUNT_ID, ACME_ACCOUNT_EMAIL, JSON.stringify(accountKeyJwk), accountUrl)
            .run();
    }

    // Return client configured with the loaded/created account key (as CryptoKey)
    // Need to import JWK back to CryptoKey for the acme.Client
    const accountCryptoKey = await acme.crypto.importJwk(accountKeyJwk); // Import JWK to get CryptoKey

    return new acme.Client({
        directoryUrl: LE_STAGING_URL, // Use env.ACME_DIRECTORY_URL
        accountKey: accountCryptoKey, // Pass the CryptoKey
        accountUrl: accountUrl // Pass the account URL
    });
}

/**
 * Handles the end-to-end process of issuing a DV certificate for a given FQDN.
 * This includes:
 * 1. Creating an ACME order.
 * 2. Satisfying HTTP-01 challenges.
 * 3. Generating a CSR for the domain.
 * 4. Finalizing the order.
 * 5. Storing the issued certificate and private key in D1.
 * @param fqdn The fully qualified domain name for which to issue the certificate.
 * @param db D1Database instance.
 * @param userId The ID of the user requesting the certificate.
 * @param domainId The ID of the domain record in the Domains table.
 * @param env Worker environment variables.
 * @returns An object indicating success or failure, with certificate ID or error details.
 */
export async function issueCertificateForDomain(
    fqdn: string,
    db: D1Database,
    userId: string,
    domainId: string,
    env: Env // Pass worker env for potential configs like ACME_URL, EMAIL
): Promise<{success: boolean, certificateId?: string, message: string, error?: any}> {
    try {
        // IMPORTANT: Ensure ACME_ACCOUNT_EMAIL is configured securely, ideally via Worker secrets/env vars for production.
        // Do NOT hardcode production email addresses directly in the source code if deploying to production.
        const client = await getOrCreateAcmeClient(db, env);

        const order = await client.createOrder({
            identifiers: [{ type: 'dns', value: fqdn }],
        });

        const authorizations = await client.getAuthorizations(order);
        if (!authorizations || authorizations.length === 0) {
            throw new Error('No authorizations found for the order.');
        }

        const challengePromises = authorizations.map(async (authz) => {
            const httpChallenge = authz.challenges.find(c => c.type === 'http-01');
            if (!httpChallenge) {
                throw new Error(`HTTP-01 challenge not found for ${authz.identifier.value}`);
            }

            const keyAuthorization = await client.getChallengeKeyAuthorization(httpChallenge);
            const token = httpChallenge.token;
            // Challenge tokens are typically valid for a short period. Let's say 5 minutes.
            const challengeExpiry = new Date(Date.now() + 5 * 60 * 1000);

            await db.prepare('INSERT INTO AcmeHttpChallenges (token, content, domain_fqdn, expires_at) VALUES (?, ?, ?, ?)')
                .bind(token, keyAuthorization, fqdn, toD1ISOString(challengeExpiry))
                .run();

            // Notify ACME server that challenge is ready (verify then complete)
            // Some clients might have a single "challengeReady" method.
            // acme-client expects verification of the authz, then notifying challenge is ready.
            await client.verifyChallenge(authz, httpChallenge); // This signals to the CA that you've acknowledged the challenge
            await client.completeChallenge(httpChallenge); // This tells the CA to attempt to verify the challenge

            // Wait for challenge validation
            // This is a simplified polling loop. Real-world might need more robust logic, longer timeouts, or webhooks if supported.
            let attempts = 0;
            const maxAttempts = 20; // Approx 1 minute with 3s waits
            let challengeStatus = 'pending';
            let challengeDetails;

            while (attempts < maxAttempts && challengeStatus === 'pending') {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                challengeDetails = await client.getChallengeDetails(httpChallenge.url);
                challengeStatus = challengeDetails.status;
                if (challengeStatus === 'valid') break;
                if (challengeStatus === 'invalid') {
                    console.error("Challenge invalid:", challengeDetails.error);
                    throw new Error(`Challenge failed for ${fqdn}: ${challengeDetails.error?.detail || 'Unknown validation error'}`);
                }
                attempts++;
            }

            if (challengeStatus !== 'valid') {
                throw new Error(`Challenge verification timed out or failed for ${fqdn}. Status: ${challengeStatus}`);
            }

            // Optional: Clean up challenge token immediately after validation.
            // Alternatively, a separate cron-like worker could periodically clean up expired tokens.
            // await db.prepare('DELETE FROM AcmeHttpChallenges WHERE token = ?').bind(token).run();
        });

        // Wait for all authorization challenges to be processed and validated.
        await Promise.all(challengePromises);

        // All challenges should now be valid. Proceed to create CSR and finalize the order.
        const [certificatePrivateKey, csrPem] = await acme.crypto.createCsr({ commonName: fqdn } /*, other CSR options like SANs can be added here */);

        // Double-check order status before finalizing (should be 'ready')
        const orderDetails = await client.getOrder(order);
        if (orderDetails.status !== 'ready') {
             // This might happen if challenges weren't fully processed or there was a delay.
             throw new Error(`Order not ready for finalization. Current status: ${orderDetails.status}`);
        }

        // Finalize the order with the CSR.
        const finalizedOrder = await client.finalizeOrder(order, csrPem);
        // Retrieve the issued certificate PEM. This often includes the full chain.
        const certificatePem = await client.getCertificate(finalizedOrder);

        // Prepare certificate details for database insertion.
        const certId = crypto.randomUUID(); // Generate a unique ID for the certificate record.
        const issuedAt = new Date(); // Record current time as issued_at.
        // For expiry: Let's Encrypt certs are typically 90 days.
        // Parsing PEM for exact dates is complex without a library. Hardcoding for now.
        const expiresAt = new Date(issuedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

        const certificatePrivateKeyPem = await cryptoKeyToPkcs8Pem(certificatePrivateKey);

        // SECURITY WARNING: Storing PKCS#8 private key PEM in the database is NOT recommended for production.
        // Use a secrets manager. This is for demonstration purposes only.
        await db.prepare(
            `INSERT INTO Certificates (id, domain_id, user_id, common_name, certificate_pem,
             private_key_pem, chain_pem, issued_at, expires_at, status, acme_order_url, acme_challenge_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            certId, domainId, userId, fqdn, certificatePem,
            certificatePrivateKeyPem, // <<< --- SENSITIVE DATA --- >>>
            null, // chain_pem - LE usually includes it in certificatePem. Extract if needed.
            toD1ISOString(issuedAt),
            toD1ISOString(expiresAt),
            'issued',
            order.url, // The ACME order URL
            'http-01'
        ).run();

        // Update domain status to 'active' or similar
        await db.prepare("UPDATE Domains SET status = 'active', updated_at = ? WHERE id = ?")
            .bind(toD1ISOString(new Date()), domainId)
            .run();

        return { success: true, certificateId: certId, message: 'Certificate issued successfully.' };

    } catch (e: any) {
        console.error('ACME Service Error:', e, e.stack);
        // Optionally, store error state in Certificates table
        const errorCertId = crypto.randomUUID();
        await db.prepare(
            `INSERT INTO Certificates (id, domain_id, user_id, common_name, status, certificate_pem, private_key_pem, issued_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            errorCertId, domainId, userId, fqdn, 'issuance_error',
            e.message, // Store error in pem field for now
            'error', toD1ISOString(new Date()),toD1ISOString(new Date())
        ).run();

        await db.prepare("UPDATE Domains SET status = 'issuance_failed', updated_at = ? WHERE id = ?")
            .bind(toD1ISOString(new Date()), domainId)
            .run();

        return { success: false, message: `Failed to issue certificate: ${e.message}`, error: e };
    }
}
