import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeHLPair, scoreHigherLower } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameHigherLower(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const pair = useMemo(() => makeHLPair(seed, idx), [seed, idx]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(correct);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function submit(finalCorrect: number) {
    if (submitted || submitting) return;
    setSubmitting(true);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { correct: finalCorrect, wrong },
      points: scoreHigherLower(finalCorrect),
    });
    setSubmitting(false);
  }

  function pick(which: "a" | "b") {
    if (submitted) return;
    const bigger = pair.a.pop >= pair.b.pop ? "a" : "b";
    if (which === bigger) { setCorrect((c) => c + 1); setFlash("ok"); }
    else { setWrong((w) => w + 1); setFlash("bad"); }
    setIdx((i) => i + 1);
    setTimeout(() => setFlash(null), 120);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="📈"
          gameName="HigherLower"
          subtitle="Chi ha azzeccato più confronti"
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
              primary: { label: "Corrette", value: `${c}` },
              metrics: [
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 70 ? "good" : "default" },
                { icon: "❌", label: "Errori", value: `${w}`, tone: w > 0 ? "bad" : "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-3">
          Quale città ha <b>più abitanti</b>?
        </div>
        <div className={`grid grid-cols-2 gap-3 rounded-3xl p-2 transition-colors ${flash === "ok" ? "bg-green-500/30" : flash === "bad" ? "bg-red-500/30" : ""}`}>
          {(["a","b"] as const).map((k) => {
            const city = pair[k];
            return (
              <button
                key={k}
                onClick={() => pick(k)}
                disabled={submitted}
                className="rounded-2xl bg-card p-5 hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
              >
                <div className="text-5xl mb-2">{city.emoji}</div>
                <div className="font-black text-lg">{city.name}</div>
                <div className="text-xs text-muted-foreground mt-1">più o meno?</div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm font-bold">
          <span className="text-green-400">✅ {correct}</span>
          <span className="text-red-400">❌ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
