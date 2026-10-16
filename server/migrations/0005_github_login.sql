-- 用 GitHub 登入：一個帳號最多連一個 GitHub 帳號，一個 GitHub 帳號只能連一個帳號。
-- 只用 GitHub 註冊的帳號沒有密碼（之後可以用「忘記密碼」設定一組）。
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE oauth_accounts (
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_user_id)
);

CREATE UNIQUE INDEX oauth_accounts_user_provider_idx ON oauth_accounts (user_id, provider);
