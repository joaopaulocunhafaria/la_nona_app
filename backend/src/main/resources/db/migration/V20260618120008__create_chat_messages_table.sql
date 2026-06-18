CREATE TABLE chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_user_id  UUID NOT NULL REFERENCES chat_threads (user_id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users (id),
    text            TEXT NOT NULL,
    is_admin        BOOLEAN NOT NULL DEFAULT false,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_thread_user_id_sent_at ON chat_messages (thread_user_id, sent_at DESC);
