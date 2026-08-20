-- Add the persistent boss currency to existing users.
ALTER TABLE users ADD COLUMN NeonShards INTEGER DEFAULT 0;
