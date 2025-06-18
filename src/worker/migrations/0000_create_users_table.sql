-- Migration: 0000_create_users_table.sql
DROP TABLE IF EXISTS Users;
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now'))
);
