import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, scoreTrivia } from "@/lib/party/games";
import { getSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameTrivia(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const cfg = props.round.config as { q?: string; choices?: string[]; answer?: number };
  const q = cfg.q ?? "";
  const choices = cfg.choices ?? [];
  const answerIdx = cfg.answer ?? 0;
  const [picked, setPicked] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const durationMs = GAME_META.trivia.durationSec * 1000;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(picked);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(sel: number | null) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
    const isCorrect = sel === answerIdx;
    const points = scoreTrivia(isCorrect, elapsed, durationMs);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { picked: sel, correct: isCorrect, elapsedMs: elapsed },
      points,
    });
    setSubmitting(false);
  }

  function pick(i: number) {
    if (submitted || picked !== null) return;
    setPicked(i);
    void submit(i);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="❓"
          gameName="Trivia"
          subtitle={`Risposta: ${choices[answerIdx]}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { picked?: number | null; correct?: boolean; elapsedMs?: number };
            const t = ((pl.elapsedMs ?? 0) / 1000).toFixed(1);
            return {
              playerId: s.player_id,
              points: s.points,
              primary: pl.correct
                ? { label: "Tempo", value: `${t}s`, tone: "good" }
                : { label: "Errata", value: "❌", tone: "bad" },
              note: pl.correct
                ? undefined
                : `Ha scelto: ${pl.picked != null ? choices[pl.picked] : "—"}`,
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4">
        <div className="rounded-3xl bg-card p-6 mb-4 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">Domanda</div>
          <div className="text-xl sm:text-2xl font-black leading-tight">{q}</div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {choices.map((c, i) => {
            const isPicked = picked === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={submitted || picked !== null}
                className={`rounded-2xl px-4 py-4 text-left text-lg font-bold transition ${
                  isPicked ? "bg-primary text-primary-foreground shadow-neon" : "bg-secondary hover:bg-secondary/80"
                } disabled:opacity-60`}
              >
                <span className="inline-block w-7 h-7 mr-3 rounded-full bg-background/40 text-center leading-7 text-sm font-black">
                  {String.fromCharCode(65 + i)}
                </span>
                {c}
              </button>
            );
          })}
        </div>
        {submitted && <div className="text-center text-sm text-muted-foreground mt-3">In attesa degli altri…</div>}
      </div>
    </RoundShell>
  );
}
