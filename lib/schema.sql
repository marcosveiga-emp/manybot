-- MANYBOT SCHEMA
-- Execute this in Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Config (single row)
CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token TEXT,
  instagram_user_id TEXT,
  instagram_username TEXT,
  profile_picture_url TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automations
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  triggers TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  match_type TEXT DEFAULT 'contains',
  specific_post_id TEXT,
  public_replies TEXT[] DEFAULT '{}',
  welcome_message TEXT NOT NULL DEFAULT 'Obrigado pelo seu comentario!',
  quick_reply_button TEXT DEFAULT 'Quero saber mais',
  link_text TEXT DEFAULT 'Aqui esta o link:',
  link_button_label TEXT DEFAULT 'Acessar',
  link_url TEXT DEFAULT '',
  reminder_text TEXT DEFAULT '',
  reminder_delay_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Follow-ups
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id TEXT NOT NULL,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  step INTEGER NOT NULL DEFAULT 1,
  message TEXT NOT NULL,
  delay_after_minutes INTEGER DEFAULT 0,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  instagram_id TEXT PRIMARY KEY,
  username TEXT,
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),
  last_response_at TIMESTAMPTZ,
  last_automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
  conversation_open_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queue
CREATE TABLE IF NOT EXISTS queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_user_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_value TEXT NOT NULL,
  message JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  claimed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Events log
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  sender_id TEXT,
  sender_username TEXT,
  media_id TEXT,
  comment_id TEXT,
  message_text TEXT,
  matched_keyword TEXT,
  matched_automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
  raw_payload JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_queue_claimed ON queue(claimed_at);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_last_response ON contacts(last_response_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_contact ON followups(contact_id, sent);

-- RLS: enable on all tables, no policies (server-side only via service key)
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Atomic claim function for queue draining
CREATE OR REPLACE FUNCTION claim_next_message()
RETURNS SETOF queue
LANGUAGE plpgsql
AS $$
DECLARE
  claimed queue%ROWTYPE;
BEGIN
  UPDATE queue
  SET status = 'sending', claimed_at = NOW()
  WHERE id = (
    SELECT id FROM queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO claimed;

  IF claimed.id IS NOT NULL THEN
    RETURN NEXT claimed;
  END IF;
END;
$$;

-- Insert default config row
INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
