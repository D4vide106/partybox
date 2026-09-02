CREATE TABLE public.game_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, player_id, game_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_votes TO anon, authenticated;
GRANT ALL ON public.game_votes TO service_role;
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_votes open" ON public.game_votes FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_votes;