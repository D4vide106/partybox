import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makePieRound, scorePieChart } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

function arcPath(percent: number): string {
  if (percent >= 100) return "M 100 100 m -80 0 a 80 80 0 1 0 160 0 a 80 80 0 1 0 -160 0";
  if (percent <= 0) return "";
  const angle = (percent / 100) * Math.PI * 2 - Math.PI / 2;
  const x = 100 + 80 * Math.cos(angle);
  const y = 100 + 80 * Math.sin(angle);
  const large = percent > 50 ? 1 : 0;
  return `M 100 100 L 100 20 A 80 80 0 ${large} 1 ${x} ${y} Z`;
}

export function GamePieChart(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const round = useMemo(() => makePieRound(seed), [seed]);
  const [guess, setGuess] = useState(50);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  async function lockIn() {
    if (submitted || locked) return;
    setLocked(true);
    setSubmitting(true);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { guess, actual: round.percent },
      points: scorePieChart(guess, round.percent),
    });
    setSubmitting(false);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void lockIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const color = `hsl(${round.hue} 80% 55%)`;
  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🥧"
          gameName="PieChart"
          subtitle={`Percentuale reale: ${round.percent}%`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { guess?: number; actual?: number };
            const diff = Math.abs((p.guess ?? 0) - (p.actual ?? 0));
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Stima", value: `${p.guess ?? 0}%`, tone: diff <= 3 ? "good" : diff <= 10 ? "default" : "bad" },
              metrics: [{ icon: "🎯", label: "Errore", value: `${diff}%`, tone: diff <= 5 ? "good" : "muted" }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-3">Che percentuale della torta è colorata?</div>
        <svg viewBox="0 0 200 200" className="w-56 h-56 mx-auto">
          <circle cx="100" cy="100" r="80" fill="hsl(var(--secondary))" />
          <path d={arcPath(round.percent)} fill={color} />
          <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
        </svg>
        <div className="mt-4 text-5xl font-black text-primary tabular-nums">{guess}%</div>
        <input
          type="range"
          min={0}
          max={100}
          value={guess}
          disabled={submitted || locked}
          onChange={(e) => setGuess(parseInt(e.target.value))}
          className="w-full accent-primary mt-2 mb-4"
        />
        <button
          onClick={lockIn}
          disabled={submitted || locked}
          className="w-full rounded-2xl bg-primary text-primary-foreground py-4 font-black shadow-neon active:scale-95 disabled:opacity-40"
        >
          {locked ? "✅ Bloccato" : "Conferma stima"}
        </button>
      </div>
    </RoundShell>
  );
}
