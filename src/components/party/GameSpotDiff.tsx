import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeSpotDiff, scoreSpotDiff } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameSpotDiff(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const round = useMemo(() => makeSpotDiff(seed, idx), [seed, idx]);
  const submitted = !!mySub;

  // left grid = all base emoji, right grid = with diff
  const leftGrid = useMemo(() => Array(round.grid.length).fill(round.baseEmoji), [round]);

  function tap(i: number) {
    if (submitted || flash !== null) return;
    if (i === round.diffIdx) setCorrect((c) => c + 1);
    else setWrong((w) => w + 1);
    setFlash(i);
    setTimeout(() => { setFlash(null); setIdx((v) => v + 1); }, 350);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong },
        points: scoreSpotDiff(correct, wrong),
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
          gameEmoji="🔍"
          gameName="SpotDiff"
          subtitle="Chi ha trovato più differenze"
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
      <div className="max-w-xl mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-3">Clicca nella griglia di <b>destra</b> la casella diversa da sinistra</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Originale</div>
            <div className="grid grid-cols-4 gap-1.5 p-2 rounded-2xl bg-card border border-border">
              {leftGrid.map((e, i) => (
                <div key={i} className="aspect-square rounded-lg bg-secondary/50 text-2xl flex items-center justify-center">{e}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Trova il diverso</div>
            <div className="grid grid-cols-4 gap-1.5 p-2 rounded-2xl bg-card border border-border">
              {round.grid.map((e, i) => (
                <button
                  key={i}
                  onClick={() => tap(i)}
                  disabled={submitted || flash !== null}
                  className={`aspect-square rounded-lg text-2xl flex items-center justify-center transition-all active:scale-95 ${
                    flash === i
                      ? i === round.diffIdx ? "bg-emerald-500" : "bg-rose-500"
                      : "bg-secondary/50 hover:bg-secondary"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
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
