import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { circularity, scorePerfectCircle } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GamePerfectCircle(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [drawing, setDrawing] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  function toLocal(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function start(clientX: number, clientY: number) {
    if (submitted) return;
    setDrawing(true);
    setPoints([toLocal(clientX, clientY)]);
    setScore(0);
  }
  function move(clientX: number, clientY: number) {
    if (!drawing || submitted) return;
    setPoints((p) => [...p, toLocal(clientX, clientY)]);
  }
  function end() {
    if (!drawing) return;
    setDrawing(false);
    const c = circularity(points);
    setScore(Math.round(c * 100));
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      const c = circularity(points);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { circularity: c },
        points: scorePerfectCircle(c),
      });
      setSubmitting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const d = points.length > 1
    ? "M " + points.map((p) => `${p.x} ${p.y}`).join(" L ")
    : "";

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="⭕"
          gameName="PerfectCircle"
          subtitle="Chi ha disegnato il cerchio più perfetto"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const c = (s.payload as { circularity?: number }).circularity ?? 0;
            const pct = Math.round(c * 100);
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Perfezione", value: `${pct}%`, tone: pct >= 80 ? "good" : pct >= 50 ? "default" : "bad" },
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center select-none">
        <div className="text-sm text-muted-foreground mb-2">Trascina in un unico movimento per disegnare un cerchio</div>
        <div className="text-3xl font-black text-primary mb-2 tabular-nums">{score}%</div>
        <svg
          ref={svgRef}
          viewBox="0 0 320 320"
          className="w-full aspect-square rounded-2xl bg-card border border-border touch-none"
          onMouseDown={(e) => start(e.clientX, e.clientY)}
          onMouseMove={(e) => move(e.clientX, e.clientY)}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={(e) => { const t = e.touches[0]!; start(t.clientX, t.clientY); }}
          onTouchMove={(e) => { const t = e.touches[0]!; move(t.clientX, t.clientY); }}
          onTouchEnd={end}
        >
          <circle cx="160" cy="160" r="4" fill="hsl(var(--muted-foreground))" opacity="0.4" />
          {d && <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <button
          disabled={submitted}
          onClick={() => { setPoints([]); setScore(0); }}
          className="mt-3 rounded-full bg-secondary px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          Ricomincia
        </button>
      </div>
    </RoundShell>
  );
}
