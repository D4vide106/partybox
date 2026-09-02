
-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  player_id uuid NOT NULL,
  nickname text NOT NULL,
  avatar text NOT NULL DEFAULT '🎉',
  text text NOT NULL CHECK (length(text) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages open" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
CREATE INDEX chat_messages_room_created_idx ON public.chat_messages(room_id, created_at DESC);

-- Monopoly persistent game state (one row per active monopoly round)
CREATE TABLE public.monopoly_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  round_id uuid NOT NULL UNIQUE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  turn_player_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monopoly_games TO anon, authenticated;
GRANT ALL ON public.monopoly_games TO service_role;
ALTER TABLE public.monopoly_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monopoly_games open" ON public.monopoly_games FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.monopoly_games;
CREATE INDEX monopoly_games_room_idx ON public.monopoly_games(room_id);
