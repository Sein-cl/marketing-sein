-- Migration: 0005_create_acme_http_challenges_table.sql
DROP TABLE IF EXISTS AcmeHttpChallenges;
CREATE TABLE AcmeHttpChallenges (
    token TEXT PRIMARY KEY, -- The token part of the /.well-known/acme-challenge/<token> path
    content TEXT NOT NULL, -- The content that the CA expects to find
    domain_fqdn TEXT NOT NULL, -- The FQDN this challenge is for
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    expires_at TEXT NOT NULL -- When the challenge token can be cleaned up
);
-- Index for quick lookup by token
CREATE UNIQUE INDEX IF NOT EXISTS idx_acmehttpchallenges_token ON AcmeHttpChallenges (token);
