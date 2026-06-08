-- Web Push: durable end-of-interval notifications delivered even when the
-- tab is closed. A subscription is the browser endpoint we push to; a
-- scheduled_push is the "fire at fire_at" intent the timer registers on start.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- One active scheduled push per user — only one timer runs at a time.
CREATE TABLE IF NOT EXISTS scheduled_pushes (
  user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode      TEXT NOT NULL,
  fire_at   TIMESTAMPTZ NOT NULL,
  sent_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_scheduled_due ON scheduled_pushes(fire_at) WHERE sent_at IS NULL;
