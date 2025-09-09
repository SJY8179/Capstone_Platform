-- Add password_hash column to user_account table (idempotent)
ALTER TABLE user_account
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(60) NULL COMMENT 'BCrypt hashed password';