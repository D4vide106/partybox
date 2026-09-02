import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeOddGrid, scoreOddOneOut } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameOddOneOut(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;

  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const grid = useMemo(() => makeOddGrid(seed, idx), [seed, idx]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(correct, wrong);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(finalCorrect: number, finalWrong: number) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const points = scoreOddOneOut(finalCorrect, finalWrong);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { correct: finalCorrect, wrong: finalWrong },
      points,
    });
    setSubmitting(false);
  }

  function pick(i: number) {
    if (submitted) return;
    if (i === grid.oddIndex) {
      setCorrect((c) => c + 1);
      setFlash("ok");
    } else {
      setWrong((w) => w + 1);
      setFlash("bad");
    }
    setIdx((n) => n + 1);
    setTimeout(() => setFlash(null), 120);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="👀"
          gameName="OddOneOut"
          subtitle="Chi vede prima l'intruso"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { correct?: number; wrong?: number };
            const c = pl.correct ?? 0;
            const w = pl.wrong ?? 0;
            const tot = c + w;
            const acc = tot > 0 ? Math.round((c / tot) * 100) : 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Trovati", value: `${c}` },
              metrics: [
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 80 ? "good" : "default" },
                { icon: "❌", label: "Errori", value: `${w}`, tone: w > 0 ? "bad" : "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-3">Trova l'emoji diversa!</div>
        <div className={`grid grid-cols-4 gap-1.5 p-3 rounded-3xl transition-colors ${flash === "ok" ? "bg-green-500/30" : flash === "bad" ? "bg-red-500/30" : "bg-card"}`}>
          {grid.emojis.map((e, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={submitted}
              className="aspect-square rounded-xl bg-secondary text-4xl hover:scale-110 active:scale-90 transition-transform disabled:opacity-40"
            >
              {e}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm font-bold">
          <span className="text-green-400">✅ {correct}</span>
          <span className="text-red-400">❌ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
