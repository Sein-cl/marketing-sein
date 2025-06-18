-- Migration: 0006_create_discovered_certificates_table.sql
DROP TABLE IF EXISTS DiscoveredCertificates;
CREATE TABLE DiscoveredCertificates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL, -- The user this discovered certificate is associated with
    domain_id TEXT, -- Optional: if it can be linked to a managed domain
    fqdn TEXT NOT NULL, -- The FQDN the certificate is for
    issuer_common_name TEXT,
    issuer_organization_name TEXT,
    serial_number TEXT, -- Usually hex encoded
    not_before TEXT NOT NULL, -- Validity start (YYYY-MM-DD HH:MM:SS)
    not_after TEXT NOT NULL,  -- Validity end / Expiry (YYYY-MM-DD HH:MM:SS)
    certificate_pem TEXT, -- Optional: if the full PEM can be stored
    discovery_source TEXT NOT NULL, -- e.g., 'ct_logs', 'web_scan', 'manual_import'
    first_seen_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    last_seen_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    status TEXT DEFAULT 'active', -- e.g., 'active', 'expired', 'revoked_by_source'
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES Domains(id) ON DELETE SET NULL,
    UNIQUE (fqdn, serial_number) -- A specific cert for an FQDN should be unique
);

CREATE INDEX IF NOT EXISTS idx_discoveredcerts_user_id ON DiscoveredCertificates (user_id);
CREATE INDEX IF NOT EXISTS idx_discoveredcerts_fqdn ON DiscoveredCertificates (fqdn);
CREATE INDEX IF NOT EXISTS idx_discoveredcerts_not_after ON DiscoveredCertificates (not_after);
