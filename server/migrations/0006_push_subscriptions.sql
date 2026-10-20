-- 每日提醒的推播訂閱：一台裝置（瀏覽器）一筆，endpoint 是推播服務給的網址。
-- hour 是使用者那裡的幾點提醒，time_zone 是 IANA 時區；last_sent_day 是當地的哪一天已經處理過（寄了或不用寄）。
CREATE TABLE push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  hour smallint NOT NULL,
  time_zone text NOT NULL,
  locale text NOT NULL,
  last_sent_day date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_idx ON push_subscriptions (user_id);
