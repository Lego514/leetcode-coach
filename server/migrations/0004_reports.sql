-- 使用者送出的錯誤回報與建議。沒登入也能送（user_id 為空）；刪除帳號時一起刪除。
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  message text NOT NULL,
  contact text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX reports_created_idx ON reports (created_at DESC);

CREATE INDEX reports_user_idx ON reports (user_id);
