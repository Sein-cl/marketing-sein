-- Migration: 0001_create_domains_table.sql
DROP TABLE IF EXISTS Domains;
CREATE TABLE Domains (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    fqdn TEXT NOT NULL,
    status TEXT DEFAULT 'pending_validation', -- e.g., pending_validation, active, validation_failed
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    validated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE (user_id, fqdn) -- A user cannot add the same domain twice
);
