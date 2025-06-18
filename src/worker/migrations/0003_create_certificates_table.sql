-- Migration: 0003_create_certificates_table.sql
DROP TABLE IF EXISTS Certificates;
CREATE TABLE Certificates (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL,
    user_id TEXT NOT NULL, -- For easier querying and ownership check
    common_name TEXT NOT NULL, -- Typically the FQDN
    certificate_pem TEXT NOT NULL,
    private_key_pem TEXT NOT NULL, -- IMPORTANT: Sensitive data. Secure storage needed for prod.
    chain_pem TEXT, -- Intermediate certificates
    issued_at TEXT NOT NULL, -- YYYY-MM-DD HH:MM:SS
    expires_at TEXT NOT NULL, -- YYYY-MM-DD HH:MM:SS
    status TEXT NOT NULL, -- e.g., 'issued', 'pending_validation', 'issuance_error', 'revoked'
    acme_order_url TEXT, -- URL of the ACME order, useful for management
    acme_challenge_type TEXT, -- e.g., 'http-01'
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (domain_id) REFERENCES Domains(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
-- Index for querying active certificates by domain
CREATE INDEX IF NOT EXISTS idx_certificates_domain_id_status ON Certificates (domain_id, status);
