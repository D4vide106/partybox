import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeQuickBiggest, scoreQuickBiggest } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameQuickBiggest(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const round = useMemo(() => makeQuickBiggest(seed, idx), [seed, idx]);
  const submitted = !!mySub;

  function tap(i: number) {
    if (submitted || flash !== null) return;
    if (i === round.answer) setCorrect((c) => c + 1);
    else setWrong((w) => w + 1);
    setFlash(i);
    setTimeout(() => { setFlash(null); setIdx((v) => v + 1); }, 280);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong },
        points: scoreQuickBiggest(correct, wrong),
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
          gameEmoji="📊"
          gameName="QuickBiggest"
          subtitle="Chi ha scovato più numeri massimi"
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
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-4">Tocca il numero <b className="text-primary">più grande</b></div>
        <div className="grid grid-cols-2 gap-3">
          {round.nums.map((n, i) => (
            <button
              key={i}
              onClick={() => tap(i)}
              disabled={submitted || flash !== null}
              className={`rounded-2xl py-8 text-4xl font-black tabular-nums transition-all active:scale-95 ${
                flash === i
                  ? i === round.answer ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                  : "bg-card border border-border hover:bg-card/70"
              }`}
            >
              {n}
            </button>
          ))}
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
