import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeSortRound, scoreSpeedSort } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameSpeedSort(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [nums, setNums] = useState<number[]>(() => makeSortRound(seed, 0));
  const [completed, setCompleted] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const sorted = useMemo(() => [...nums].sort((a, b) => a - b), [nums]);
  const isDone = nums.every((n, i) => n === sorted[i]);

  useEffect(() => {
    if (isDone && !submitted) {
      const next = idx + 1;
      setCompleted((c) => c + 1);
      setIdx(next);
      setNums(makeSortRound(seed, next));
    }
  }, [isDone, idx, seed, submitted]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { rounds: completed },
        points: scoreSpeedSort(completed),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function swap(i: number, j: number) {
    if (submitted) return;
    setNums((prev) => {
      const arr = [...prev];
      [arr[i]!, arr[j]!] = [arr[j]!, arr[i]!];
      return arr;
    });
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🔀"
          gameName="SpeedSort"
          subtitle="Griglie riordinate correttamente"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const r = (s.payload as { rounds?: number }).rounds ?? 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: "Griglie",
                value: `${r}`,
                tone: r >= 3 ? "good" : r === 0 ? "bad" : "default",
              },
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-4">Riordina crescente cliccando 2 numeri per scambiarli</div>
        <SwapGrid nums={nums} onSwap={swap} disabled={submitted} />
        <div className="mt-6 text-sm">Completati: <b className="text-primary text-lg">{completed}</b></div>
      </div>
    </RoundShell>
  );
}

function SwapGrid({ nums, onSwap, disabled }: { nums: number[]; onSwap: (i: number, j: number) => void; disabled: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="grid grid-cols-3 gap-3">
      {nums.map((n, i) => (
        <button
          key={i}
          disabled={disabled}
          onClick={() => {
            if (sel === null) setSel(i);
            else if (sel === i) setSel(null);
            else { onSwap(sel, i); setSel(null); }
          }}
          className={`aspect-square rounded-2xl font-black text-3xl tabular-nums transition-all
            ${sel === i ? "bg-primary text-primary-foreground scale-95 shadow-neon" : "bg-card hover:bg-card/70"}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
