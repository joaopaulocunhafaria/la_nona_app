CREATE TABLE chat_threads (
    user_id             UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    last_message        TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    admin_unread_count  INT NOT NULL DEFAULT 0,
    user_unread_count   INT NOT NULL DEFAULT 0
);
