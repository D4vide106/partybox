import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeMathTruth, scoreMathTruth } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameMathTruth(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<"ok" | "no" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const q = useMemo(() => makeMathTruth(seed, idx), [seed, idx]);
  const submitted = !!mySub;

  function answer(v: boolean) {
    if (submitted || flash !== null) return;
    const ok = v === q.correct;
    if (ok) setCorrect((c) => c + 1); else setWrong((w) => w + 1);
    setFlash(ok ? "ok" : "no");
    setTimeout(() => { setFlash(null); setIdx((i) => i + 1); }, 350);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong },
        points: scoreMathTruth(correct, wrong),
      });
      setSubmitting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="✅"
          gameName="MathTruth"
          subtitle="Vero o falso: operazioni"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { correct?: number; wrong?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Giuste", value: `${p.correct ?? 0}`, tone: "good" },
              metrics: [{ icon: "❌", label: "Errori", value: `${p.wrong ?? 0}`, tone: "muted" }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">L'operazione è giusta?</div>
        <div className={`text-5xl sm:text-6xl font-black tabular-nums rounded-2xl border py-8 mb-6 transition-colors ${
          flash === "ok" ? "bg-emerald-500/25 border-emerald-500" :
          flash === "no" ? "bg-rose-500/25 border-rose-500" :
          "bg-card border-border"
        }`}>
          {q.text}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => answer(false)} disabled={submitted || flash !== null} className="rounded-2xl bg-rose-500 text-white py-6 text-2xl font-black shadow-neon active:scale-95 disabled:opacity-40">NO ✗</button>
          <button onClick={() => answer(true)} disabled={submitted || flash !== null} className="rounded-2xl bg-emerald-500 text-white py-6 text-2xl font-black shadow-neon active:scale-95 disabled:opacity-40">SÌ ✓</button>
        </div>
        <div className="mt-3 text-sm">
          <span className="text-emerald-400 font-black">✓ {correct}</span>
          <span className="mx-3 text-muted-foreground">·</span>
          <span className="text-rose-400 font-black">✗ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
