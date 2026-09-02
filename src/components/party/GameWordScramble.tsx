import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, scoreWordScramble, scrambleWord } from "@/lib/party/games";
import { getSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameWordScramble(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const cfg = props.round.config as { word?: string; hint?: string; seed?: number };
  const word = cfg.word ?? "";
  const hint = cfg.hint ?? "";
  const seed = cfg.seed ?? 1;
  const scrambled = useMemo(() => scrambleWord(word, seed), [word, seed]);

  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const durationMs = GAME_META.wordscramble.durationSec * 1000;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(guess: string) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
    const correct = guess.trim().toUpperCase() === word.toUpperCase();
    const points = scoreWordScramble(correct, elapsed, durationMs);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { guess: guess.trim().toUpperCase(), correct, elapsedMs: elapsed },
      points,
    });
    setSubmitting(false);
  }

  // Auto-submit as soon as correct
  useEffect(() => {
    if (!submitted && !submitting && input.trim().toUpperCase() === word.toUpperCase()) {
      void submit(input);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, word]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🔤"
          gameName="WordScramble"
          subtitle={`Parola: ${word}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { guess?: string; correct?: boolean; elapsedMs?: number };
            const t = ((pl.elapsedMs ?? 0) / 1000).toFixed(1);
            return {
              playerId: s.player_id,
              points: s.points,
              primary: pl.correct
                ? { label: "Tempo", value: `${t}s`, tone: "good" }
                : { label: "Errata", value: "❌", tone: "bad" },
              note: pl.correct ? undefined : `Ha scritto: "${pl.guess || "—"}"`,
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-6 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Indizio</div>
        <div className="text-lg font-bold mb-4">💡 {hint}</div>
        <div className="rounded-3xl bg-card p-6 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Lettere mescolate</div>
          <div className="text-5xl font-black tracking-[0.3em] text-primary text-glow mb-4 select-none">
            {scrambled}
          </div>
          <input
            type="text"
            autoFocus
            disabled={submitted}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="La parola?"
            className="w-full bg-transparent border-b-2 border-border text-3xl font-black text-center outline-none focus:border-primary uppercase tracking-widest"
          />
        </div>
        <button
          onClick={() => submit(input)}
          disabled={submitted || !input}
          className="w-full rounded-2xl bg-primary text-primary-foreground text-lg font-black py-4 shadow-neon disabled:opacity-40"
        >
          {submitted ? "✅ Inviato" : "Invia"}
        </button>
      </div>
    </RoundShell>
  );
}
