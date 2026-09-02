import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/party/client-id";
import {
  useRoom, usePlayers, useCurrentRound, useVotes,
  useHeartbeat, usePresenceSweep, activePlayers, getSyncedServerNowMs,
} from "@/lib/party/hooks";
import { useBotRunner } from "@/lib/party/bot-simulation";
import {
  GAME_META, type GameType, TYPE_PHRASES, PRICE_PRODUCTS, DRAW_PROMPTS,
  SCRAMBLE_WORDS, TRIVIA_QUESTIONS, FLAG_POOL, EMOJI_RIDDLES,
  CAPITALS_POOL, TYPO_POOL,
  pickUniqueIndex, CONTENT_POOL_SIZES,
} from "@/lib/party/games";
import { Lobby } from "@/components/party/Lobby";
import { GameTapBlitz } from "@/components/party/GameTapBlitz";
import { GameTypeRush } from "@/components/party/GameTypeRush";
import { GamePriceGuess } from "@/components/party/GamePriceGuess";
import { GameDrawBlitz } from "@/components/party/GameDrawBlitz";
import { GameReaction } from "@/components/party/GameReaction";
import { GameMathBlitz } from "@/components/party/GameMathBlitz";
import { GameEmojiMemory } from "@/components/party/GameEmojiMemory";
import { GameWordScramble } from "@/components/party/GameWordScramble";
import { GameOddOneOut } from "@/components/party/GameOddOneOut";
import { GameStroop } from "@/components/party/GameStroop";
import { GameTrivia } from "@/components/party/GameTrivia";
import { GameCountEmoji } from "@/components/party/GameCountEmoji";
import { GameFlagGuess } from "@/components/party/GameFlagGuess";
import { GameHigherLower } from "@/components/party/GameHigherLower";
import { GameAimTrainer } from "@/components/party/GameAimTrainer";
import { GameSimon } from "@/components/party/GameSimon";
import { GameColorMatch } from "@/components/party/GameColorMatch";
import { GamePopBubbles } from "@/components/party/GamePopBubbles";
import { GameSpeedSort } from "@/components/party/GameSpeedSort";
import { GameWhackMole } from "@/components/party/GameWhackMole";
import { GameEmojiRiddle } from "@/components/party/GameEmojiRiddle";
import { GameNineTarget } from "@/components/party/GameNineTarget";
import { GamePatternCopy } from "@/components/party/GamePatternCopy";
import { GameTrueFalse } from "@/components/party/GameTrueFalse";
import { GameMonopoly } from "@/components/party/GameMonopoly";
import { GameRhythmTap } from "@/components/party/GameRhythmTap";
import { GameStackTower } from "@/components/party/GameStackTower";
import { GameSnake } from "@/components/party/GameSnake";
import { GamePerfectCircle } from "@/components/party/GamePerfectCircle";
import { GameCardMatch } from "@/components/party/GameCardMatch";
import { GameGuessNumber } from "@/components/party/GameGuessNumber";
import { GameSequenceNext } from "@/components/party/GameSequenceNext";
import { GameCapitals } from "@/components/party/GameCapitals";
import { GamePieChart } from "@/components/party/GamePieChart";
import { GameTypoHunt } from "@/components/party/GameTypoHunt";
import { GameMemoryDigits } from "@/components/party/GameMemoryDigits";
import { GameAnagramSprint } from "@/components/party/GameAnagramSprint";
import { GameFindPair } from "@/components/party/GameFindPair";
import { GameConnectDots } from "@/components/party/GameConnectDots";
import { GameGoNoGo } from "@/components/party/GameGoNoGo";
import { GameSpotDiff } from "@/components/party/GameSpotDiff";
import { GameMathTruth } from "@/components/party/GameMathTruth";
import { GameQuickBiggest } from "@/components/party/GameQuickBiggest";
import { GameLetterPop } from "@/components/party/GameLetterPop";
import { GameCoinSplit } from "@/components/party/GameCoinSplit";
import { Leaderboard } from "@/components/party/Leaderboard";

export const Route = createFileRoute("/room/$code")({
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { room, loading } = useRoom(code);
  const players = usePlayers(room?.id);
  const round = useCurrentRound(room?.id, room?.current_round ?? 0);
  const votes = useVotes(room?.id);

  const [clientId, setClientId] = useState("");
  const [startingRound, setStartingRound] = useState(false);
  useEffect(() => { setClientId(getClientId()); }, []);

  const me = useMemo(
    () => players.find((p) => p.client_id === clientId) ?? null,
    [players, clientId],
  );
  const isHost = !!me?.is_host || room?.host_client_id === clientId;

  // Heartbeat + host-side presence sweep + bot simulation
  useHeartbeat(me?.id);
  usePresenceSweep(room, players, isHost);
  useBotRunner(room, round, players, isHost);

  // If I've been kicked, bounce home
  useEffect(() => {
    if (me?.kicked) {
      toast.error("Sei stato espulso dalla stanza");
      void navigate({ to: "/" });
    }
  }, [me?.kicked, navigate]);

  // Auto-join guard: if the client is not a player, kick to home.
  useEffect(() => {
    if (loading || !room || !clientId) return;
    if (!me && players.length > 0) {
      toast.error("Non fai parte di questa stanza. Rientra dal codice.");
      void navigate({ to: "/" });
    }
  }, [loading, room, clientId, me, players.length, navigate]);

  async function startNextRound() {
    if (!room || !isHost || startingRound) return;
    setStartingRound(true);
    try {
      const nextIdx = room.current_round;
      const gameType = room.game_sequence[nextIdx] as GameType | undefined;
      if (!gameType) {
        await supabase.from("rooms").update({ status: "finished" }).eq("id", room.id);
        return;
      }

      // Build config with anti-repeat sampling
      const pool = room.used_pool ?? {};
      const nextPool: Record<string, number[]> = { ...pool };
      let config: Record<string, unknown> = {};

      function pickIdx(key: keyof typeof CONTENT_POOL_SIZES): number {
        const size = CONTENT_POOL_SIZES[key];
        const [idx, updated] = pickUniqueIndex(size, pool[key] ?? []);
        nextPool[key] = updated;
        return idx;
      }

      if (gameType === "typerush") {
        const i = pickIdx("typerush");
        config = { phrase: TYPE_PHRASES[i] };
      } else if (gameType === "priceguess") {
        const i = pickIdx("priceguess");
        config = { product: PRICE_PRODUCTS[i] };
      } else if (gameType === "drawblitz") {
        const i = pickIdx("drawblitz");
        config = { prompt: DRAW_PROMPTS[i], phase: "draw" };
      } else if (gameType === "wordscramble") {
        const i = pickIdx("wordscramble");
        const w = SCRAMBLE_WORDS[i]!;
        config = { word: w.word, hint: w.hint, seed: Math.floor(Math.random() * 1e9) };
      } else if (gameType === "trivia") {
        const i = pickIdx("trivia");
        const t = TRIVIA_QUESTIONS[i]!;
        config = { q: t.q, choices: t.choices, answer: t.answer };
      } else if (gameType === "flagguess") {
        const i = pickIdx("flagguess");
        const f = FLAG_POOL[i]!;
        config = { flag: f.flag, answers: f.answers };
      } else if (gameType === "emojiriddle") {
        const i = pickIdx("emojiriddle");
        const r = EMOJI_RIDDLES[i]!;
        config = { emojis: r.emojis, answers: r.answers, hint: r.hint };
      } else if (gameType === "capitals") {
        const i = pickIdx("capitals");
        const c = CAPITALS_POOL[i]!;
        const options = [c.capital, ...c.distractors];
        // shuffle
        for (let a = options.length - 1; a > 0; a--) {
          const b = Math.floor(Math.random() * (a + 1));
          [options[a]!, options[b]!] = [options[b]!, options[a]!];
        }
        config = { country: c.country, flag: c.flag, capital: c.capital, options };
      } else if (gameType === "typohunt") {
        const i = pickIdx("typohunt");
        const t = TYPO_POOL[i]!;
        config = { words: t.words, typoIndex: t.typoIndex, correct: t.correct };
      } else if (
        gameType === "mathblitz" || gameType === "emojimemory" ||
        gameType === "oddoneout" || gameType === "stroop" ||
        gameType === "countemoji" || gameType === "higherlower" ||
        gameType === "aimtrainer" || gameType === "simon" ||
        gameType === "colormatch" || gameType === "popbubbles" ||
        gameType === "speedsort" || gameType === "whackmole" ||
        gameType === "ninetarget" || gameType === "patterncopy" ||
        gameType === "truefalse" || gameType === "rhythmtap" ||
        gameType === "stacktower" || gameType === "snake" ||
        gameType === "perfectcircle" || gameType === "cardmatch" ||
        gameType === "guessnumber" || gameType === "sequencenext" ||
        gameType === "piechart" || gameType === "memorydigits" ||
        gameType === "anagramsprint" || gameType === "findpair" ||
        gameType === "connectdots" || gameType === "gonogo" ||
        gameType === "spotdiff" || gameType === "mathtruth" ||
        gameType === "quickbiggest" || gameType === "letterpop" ||
        gameType === "coinsplit"
      ) {
        config = { seed: Math.floor(Math.random() * 1e9) };
      }

      // Duration: host override wins, else game default
      const overrideDur = room.settings?.roundDurationSec;
      const durationSec = overrideDur && overrideDur > 0 ? overrideDur : GAME_META[gameType].durationSec;
      const durationMs = durationSec * 1000;
      const launchGraceMs = 3000;
      const serverNowMs = await getSyncedServerNowMs(true);
      const startedAt = new Date(serverNowMs).toISOString();
      const endsAt = new Date(serverNowMs + durationMs + launchGraceMs).toISOString();

      const roundNumber = room.current_round + 1;

      const { data: freshPlayers } = await supabase
        .from("players")
        .select("id,client_id,kicked,left_at")
        .eq("room_id", room.id)
        .order("joined_at");
      const participantIds = (freshPlayers ?? [])
        .filter((p) => !p.kicked && !p.left_at)
        .map((p) => p.id);
      const roundConfig = {
        ...config,
        participantIds: participantIds.length > 0 ? participantIds : me ? [me.id] : [],
        launchGraceMs,
      };

      const { data: existingRound } = await supabase
        .from("rounds")
        .select("id")
        .eq("room_id", room.id)
        .eq("round_number", roundNumber)
        .limit(1)
        .maybeSingle();
      if (existingRound) {
        await supabase.from("rooms").update({
          status: "playing",
          current_round: roundNumber,
          updated_at: new Date().toISOString(),
        }).eq("id", room.id);
        return;
      }

      const { error: rErr } = await supabase.from("rounds").insert({
        room_id: room.id,
        round_number: roundNumber,
        game_type: gameType,
        status: "active",
        config: roundConfig as never,
        started_at: startedAt,
        ends_at: endsAt,
      });
      if (rErr) { toast.error("Errore avvio round: " + rErr.message); return; }

      await supabase.from("rooms").update({
        status: "playing",
        current_round: roundNumber,
        used_pool: nextPool as never,
        updated_at: new Date().toISOString(),
      }).eq("id", room.id);
    } finally {
      setStartingRound(false);
    }
  }

  async function advanceToNext() {
    if (!room || !isHost || !round) return;
    await supabase.from("rounds").update({ status: "done" }).eq("id", round.id);
    await startNextRound();
  }

  async function backToLobby() {
    if (!room || !isHost) return;
    await supabase.from("player_votes").delete().eq("room_id", room.id);
    await supabase.from("rounds").delete().eq("room_id", room.id);
    await supabase.from("players").update({ score: 0 }).eq("room_id", room.id);
    await supabase.from("rooms").update({
      status: "lobby",
      current_round: 0,
      used_pool: {} as never,
    }).eq("id", room.id);
  }

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Caricamento…</div>;
  }
  if (!room) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-4">
        <Search className="h-12 w-12 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-black">Stanza non trovata</h1>
        <p className="text-muted-foreground text-center">Il codice <b className="text-accent">{code}</b> non esiste (o è scaduto).</p>
        <button onClick={() => navigate({ to: "/" })} className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-neon">
          Torna alla home
        </button>
      </main>
    );
  }

  if (room.status === "lobby") {
    return <Lobby room={room} players={players} me={me} isHost={isHost} votes={votes} onStart={startNextRound} />;
  }

  if (room.status === "finished") {
    return (
      <Leaderboard
        players={players}
        title="Partita finita!"
        isHost={isHost}
        actionLabel="Nuova partita"
        onAction={backToLobby}
      />
    );
  }

  if (!round || !me) {
    // If I'm not connected yet or round hasn't materialized, keep it minimal.
    const activeCount = activePlayers(players).length;
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground text-sm">
        Preparazione round… ({activeCount} attivi)
      </div>
    );
  }

  const gameType = round.game_type as GameType;
  const commonProps = { room, round, me, players, isHost, onAdvance: advanceToNext, votes };

  return (
    <div key={round.id}>
      {gameType === "tapblitz" && <GameTapBlitz {...commonProps} />}
      {gameType === "typerush" && <GameTypeRush {...commonProps} />}
      {gameType === "priceguess" && <GamePriceGuess {...commonProps} />}
      {gameType === "drawblitz" && <GameDrawBlitz {...commonProps} />}
      {gameType === "reaction" && <GameReaction {...commonProps} />}
      {gameType === "mathblitz" && <GameMathBlitz {...commonProps} />}
      {gameType === "emojimemory" && <GameEmojiMemory {...commonProps} />}
      {gameType === "wordscramble" && <GameWordScramble {...commonProps} />}
      {gameType === "oddoneout" && <GameOddOneOut {...commonProps} />}
      {gameType === "stroop" && <GameStroop {...commonProps} />}
      {gameType === "trivia" && <GameTrivia {...commonProps} />}
      {gameType === "countemoji" && <GameCountEmoji {...commonProps} />}
      {gameType === "flagguess" && <GameFlagGuess {...commonProps} />}
      {gameType === "higherlower" && <GameHigherLower {...commonProps} />}
      {gameType === "aimtrainer" && <GameAimTrainer {...commonProps} />}
      {gameType === "simon" && <GameSimon {...commonProps} />}
      {gameType === "colormatch" && <GameColorMatch {...commonProps} />}
      {gameType === "popbubbles" && <GamePopBubbles {...commonProps} />}
      {gameType === "speedsort" && <GameSpeedSort {...commonProps} />}
      {gameType === "whackmole" && <GameWhackMole {...commonProps} />}
      {gameType === "emojiriddle" && <GameEmojiRiddle {...commonProps} />}
      {gameType === "ninetarget" && <GameNineTarget {...commonProps} />}
      {gameType === "patterncopy" && <GamePatternCopy {...commonProps} />}
      {gameType === "truefalse" && <GameTrueFalse {...commonProps} />}
      {gameType === "rhythmtap" && <GameRhythmTap {...commonProps} />}
      {gameType === "stacktower" && <GameStackTower {...commonProps} />}
      {gameType === "snake" && <GameSnake {...commonProps} />}
      {gameType === "perfectcircle" && <GamePerfectCircle {...commonProps} />}
      {gameType === "cardmatch" && <GameCardMatch {...commonProps} />}
      {gameType === "guessnumber" && <GameGuessNumber {...commonProps} />}
      {gameType === "sequencenext" && <GameSequenceNext {...commonProps} />}
      {gameType === "capitals" && <GameCapitals {...commonProps} />}
      {gameType === "piechart" && <GamePieChart {...commonProps} />}
      {gameType === "typohunt" && <GameTypoHunt {...commonProps} />}
      {gameType === "memorydigits" && <GameMemoryDigits {...commonProps} />}
      {gameType === "anagramsprint" && <GameAnagramSprint {...commonProps} />}
      {gameType === "findpair" && <GameFindPair {...commonProps} />}
      {gameType === "connectdots" && <GameConnectDots {...commonProps} />}
      {gameType === "gonogo" && <GameGoNoGo {...commonProps} />}
      {gameType === "spotdiff" && <GameSpotDiff {...commonProps} />}
      {gameType === "mathtruth" && <GameMathTruth {...commonProps} />}
      {gameType === "quickbiggest" && <GameQuickBiggest {...commonProps} />}
      {gameType === "letterpop" && <GameLetterPop {...commonProps} />}
      {gameType === "coinsplit" && <GameCoinSplit {...commonProps} />}
      {gameType === "monopoly" && <GameMonopoly {...commonProps} />}
    </div>
  );
}
