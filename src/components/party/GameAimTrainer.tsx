import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeAimTarget, scoreAimTrainer } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameAimTrainer(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const submitted = !!mySub;
  const [submitting, setSubmitting] = useState(false);
  const target = makeAimTarget(seed, idx);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { hits, misses },
        points: scoreAimTrainer(hits),
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
          gameEmoji="🎯"
          gameName="AimTrainer"
          subtitle="Chi ha centrato più bersagli"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { hits?: number; misses?: number };
            const h = pl.hits ?? 0;
            const m = pl.misses ?? 0;
            const total = h + m;
            const acc = total > 0 ? Math.round((h / total) * 100) : 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Centri", value: `${h}` },
              metrics: [
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 75 ? "good" : "default" },
                { icon: "❌", label: "Fuori", value: `${m}`, tone: "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-lg mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-2">Clicca il bersaglio più veloce possibile!</div>
        <div className="text-4xl font-black text-primary mb-3 tabular-nums">🎯 {hits}</div>
        <div
          onClick={() => { if (!submitted) setMisses((m) => m + 1); }}
          className="relative rounded-3xl bg-card overflow-hidden select-none"
          style={{ aspectRatio: "1 / 1", touchAction: "manipulation" }}
        >
          <button
            disabled={submitted}
            onClick={(e) => { e.stopPropagation(); setHits((h) => h + 1); setIdx((i) => i + 1); }}
            className="absolute rounded-full bg-gradient-to-br from-red-400 to-rose-600 shadow-neon animate-bounce-in"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              width: target.size,
              height: target.size,
              transform: "translate(-50%, -50%)",
            }}
            aria-label="bersaglio"
          />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Clic fuori = ❌ (nessuna penalità)</div>
      </div>
    </RoundShell>
  );
}
