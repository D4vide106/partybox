import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeNineTarget, scoreNineTarget } from "@/lib/party/games";
import { getSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameNineTarget(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const { nums, target } = useMemo(() => makeNineTarget(seed), [seed]);
  const startedAt = useMemo(() => new Date(props.round.started_at ?? Date.now()).getTime(), [props.round.started_at]);
  const durationMs = 25000;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const sum = [...selected].reduce((acc, i) => acc + nums[i]!, 0);
  const diff = Math.abs(sum - target);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { sum, target, diff },
        points: scoreNineTarget(sum === target && selected.size > 0, diff, elapsed, durationMs),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function toggle(i: number) {
    if (locked || submitted) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

  async function lockIn() {
    if (submitted || submitting || selected.size === 0) return;
    setLocked(true);
    setSubmitting(true);
    const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { sum, target, diff },
      points: scoreNineTarget(sum === target, diff, elapsed, durationMs),
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🎰"
          gameName="NineTarget"
          subtitle={`Target: ${target}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { sum?: number; diff?: number };
            const d = pl.diff ?? 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: "Scarto",
                value: d === 0 ? "🎯 0" : `Δ ${d}`,
                tone: d === 0 ? "good" : d > 10 ? "bad" : "default",
              },
              metrics: [
                { icon: "Σ", label: "Somma", value: `${pl.sum ?? 0}` },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-1">Somma al target</div>
        <div className="text-6xl font-black text-primary text-glow mb-3 tabular-nums">🎯 {target}</div>
        <div className={`text-3xl font-black mb-4 tabular-nums ${sum === target ? "text-green-400" : "text-muted-foreground"}`}>= {sum}</div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {nums.map((n, i) => {
            const on = selected.has(i);
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                disabled={locked || submitted}
                className={`aspect-square rounded-2xl font-black text-3xl tabular-nums transition-all
                  ${on ? "bg-primary text-primary-foreground scale-95 shadow-neon" : "bg-card hover:bg-card/70"}`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <button
          onClick={lockIn}
          disabled={submitted || locked || selected.size === 0}
          className="w-full rounded-2xl bg-accent text-accent-foreground font-black py-4 shadow-neon-yellow disabled:opacity-40"
        >
          {submitted ? "Bloccato ✓" : "🔒 Conferma"}
        </button>
      </div>
    </RoundShell>
  );
}
