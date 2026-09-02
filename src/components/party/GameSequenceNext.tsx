import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeSequence, scoreSequenceNext } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameSequenceNext(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const round = useMemo(() => makeSequence(seed, idx), [seed, idx]);
  const submitted = !!mySub;

  function choose(v: number) {
    if (submitted || pick !== null) return;
    setPick(v);
    if (v === round.answer) setCorrect((c) => c + 1);
    else setWrong((w) => w + 1);
    setTimeout(() => { setPick(null); setIdx((i) => i + 1); }, 700);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong },
        points: scoreSequenceNext(correct, wrong),
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
          gameEmoji="🔗"
          gameName="SequenceNext"
          subtitle="Sequenze completate"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { correct?: number; wrong?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Giuste", value: `${p.correct ?? 0}` },
              metrics: [{ icon: "❌", label: "Sbagliate", value: `${p.wrong ?? 0}`, tone: "muted" }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-3">Qual è il numero successivo?</div>
        <div className="text-3xl font-black text-primary tabular-nums mb-6 flex items-center justify-center gap-3 flex-wrap">
          {round.series.map((n, i) => (
            <span key={i} className="rounded-xl bg-card border border-border px-4 py-2">{n}</span>
          ))}
          <span className="text-muted-foreground">?</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {round.choices.map((c, i) => (
            <button
              key={i}
              onClick={() => choose(c)}
              disabled={submitted || pick !== null}
              className={`rounded-2xl py-5 text-2xl font-black tabular-nums transition-all active:scale-95 ${
                pick === c
                  ? c === round.answer
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                  : "bg-card border border-border hover:bg-card/70"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4 text-sm">
          <span className="text-emerald-400 font-black">✓ {correct}</span>
          <span className="mx-3 text-muted-foreground">·</span>
          <span className="text-rose-400 font-black">✗ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
