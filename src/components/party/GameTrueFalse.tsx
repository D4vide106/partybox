import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeTrueFalse, scoreTrueFalse } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameTrueFalse(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const q = makeTrueFalse(seed, idx);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong },
        points: scoreTrueFalse(correct, wrong),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function answer(v: boolean) {
    if (submitted) return;
    if (v === q.ans) { setCorrect((c) => c + 1); setFlash("ok"); }
    else { setWrong((w) => w + 1); setFlash("bad"); }
    setTimeout(() => setFlash(null), 180);
    setIdx((i) => i + 1);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="✔️"
          gameName="TrueFalse"
          subtitle="Vero o falso, alla svelta"
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
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 75 ? "good" : "default" },
                { icon: "❌", label: "Errori", value: `${w}`, tone: w > 0 ? "bad" : "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-4">Vero o falso? Rispondi veloce!</div>
        <div className={`rounded-3xl p-8 mb-6 min-h-[180px] flex items-center justify-center text-2xl font-black transition-colors ${flash === "ok" ? "bg-green-500/30" : flash === "bad" ? "bg-red-500/30" : "bg-card"}`}>
          {q.q}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={submitted}
            onClick={() => answer(true)}
            className="rounded-2xl bg-green-500 text-white text-2xl font-black py-6 shadow-neon disabled:opacity-40"
          >✅ VERO</button>
          <button
            disabled={submitted}
            onClick={() => answer(false)}
            className="rounded-2xl bg-red-500 text-white text-2xl font-black py-6 shadow-neon disabled:opacity-40"
          >❌ FALSO</button>
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm font-bold">
          <span className="text-green-400">✅ {correct}</span>
          <span className="text-red-400">❌ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
