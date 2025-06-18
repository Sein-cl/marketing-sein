-- Migration: 0004_create_acme_accounts_table.sql
DROP TABLE IF EXISTS AcmeAccounts;
CREATE TABLE AcmeAccounts (
    id TEXT PRIMARY KEY, -- e.g., 'default_account' or based on some identifier
    email TEXT NOT NULL UNIQUE, -- Email associated with ACME account
    account_url TEXT, -- The URL of the ACME account
    private_key_jwk TEXT NOT NULL, -- Account private key in JWK format (JSON string)
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);
