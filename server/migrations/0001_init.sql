CREATE SEQUENCE record_version_seq;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE records (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  collection text NOT NULL,
  key text NOT NULL,
  data jsonb,
  deleted boolean NOT NULL DEFAULT false,
  updated_at bigint NOT NULL,
  version bigint NOT NULL DEFAULT nextval('record_version_seq'),
  PRIMARY KEY (user_id, collection, key)
);

CREATE INDEX records_user_version_idx ON records (user_id, version);
