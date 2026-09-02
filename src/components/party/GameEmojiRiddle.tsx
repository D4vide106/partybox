import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRiddle, scoreEmojiRiddle } from "@/lib/party/games";
import { getSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameEmojiRiddle(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const cfg = props.round.config as { emojis: string; answers: string[]; hint: string };
  const startedAt = useMemo(() => new Date(props.round.started_at ?? Date.now()).getTime(), [props.round.started_at]);
  const durationMs = 25000;
  const [input, setInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      const guess = normalizeRiddle(input);
      const correct = cfg.answers.some((a) => normalizeRiddle(a) === guess) && guess.length > 0;
      const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { guess: input, correct },
        points: scoreEmojiRiddle(correct, elapsed, durationMs),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submitNow() {
    if (submitted || submitting) return;
    setSubmitting(true);
    const guess = normalizeRiddle(input);
    const correct = cfg.answers.some((a) => normalizeRiddle(a) === guess) && guess.length > 0;
    const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { guess: input, correct },
      points: scoreEmojiRiddle(correct, elapsed, durationMs),
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🎬"
          gameName="EmojiRiddle"
          subtitle={`Risposta: ${cfg.answers[0]}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { guess?: string; correct?: boolean };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: pl.correct ? "Esatto" : "Sbagliato",
                value: pl.correct ? "✅" : "❌",
                tone: pl.correct ? "good" : "bad",
              },
              note: pl.guess ? `Risposta: "${pl.guess}"` : "Nessuna risposta",
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-6 text-center">
        <div className="text-sm text-muted-foreground mb-2">Indovina il film / titolo</div>
        <div className="text-7xl mb-6 tracking-widest">{cfg.emojis}</div>
        <input
          disabled={submitted}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submitNow()}
          placeholder="La tua risposta…"
          className="w-full bg-card rounded-2xl px-4 py-4 text-center text-xl font-bold outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={submitNow}
          disabled={submitted || !input.trim()}
          className="mt-3 w-full rounded-2xl bg-primary text-primary-foreground font-black py-4 shadow-neon disabled:opacity-40"
        >
          {submitted ? "Inviato ✓" : "Invia"}
        </button>
        <button
          onClick={() => setShowHint((v) => !v)}
          className="mt-4 text-xs text-muted-foreground underline"
        >
          {showHint ? cfg.hint : "💡 Mostra suggerimento"}
        </button>
      </div>
    </RoundShell>
  );
}
