
-- Extend rooms with host settings, disconnect timeout, anti-repeat pool
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS disconnect_timeout_sec int NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS used_pool jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Extend players with presence + moderation
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_connected boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS kicked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS left_at timestamptz;

-- Votekick table
CREATE TABLE IF NOT EXISTS public.player_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, voter_id, target_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_votes TO anon, authenticated;
GRANT ALL ON public.player_votes TO service_role;

ALTER TABLE public.player_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_votes open" ON public.player_votes;
CREATE POLICY "player_votes open" ON public.player_votes
  FOR ALL USING (true) WITH CHECK (true);

-- Enforce one submission per (round, player)
CREATE UNIQUE INDEX IF NOT EXISTS submissions_round_player_uniq
  ON public.submissions(round_id, player_id);

-- Realtime: add votes; ignore duplicates on already-published tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.player_votes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
