-- Migration: 0002_create_usersessions_table.sql
DROP TABLE IF EXISTS UserSessions;
CREATE TABLE UserSessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL, -- Store as ISO8601 string e.g. YYYY-MM-DD HH:MM:SS
    created_at TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
