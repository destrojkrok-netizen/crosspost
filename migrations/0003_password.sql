-- Email + password sign-in alongside Google. NULL = Google-only account.
ALTER TABLE users ADD COLUMN password_hash TEXT;
