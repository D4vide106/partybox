import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, makeConnectDots, scoreConnectDots } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const TOTAL = 12;

export function GameConnectDots(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const dots = useMemo(() => makeConnectDots(seed, TOTAL), [seed]);
  const [t0] = useState(() => Date.now());
  const [next, setNext] = useState(1);
  const [wrong, setWrong] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const done = next > dots.length;

  function tap(n: number) {
    if (submitted || done) return;
    if (n === next) setNext((v) => v + 1);
    else setWrong((w) => w + 1);
  }

  async function submit() {
    setSubmitting(true);
    const elapsedMs = Date.now() - t0;
    const durationMs = (props.room.settings?.roundDurationSec ?? GAME_META.connectdots.durationSec) * 1000;
    const connected = next - 1;
    const pts = Math.max(0, scoreConnectDots(connected, dots.length, elapsedMs, durationMs) - wrong * 40);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { connected, wrong, elapsedMs, done: connected === dots.length },
      points: pts,
    });
    setSubmitting(false);
  }

  useEffect(() => {
    if (!done || submitted || submitting) return;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🔗"
          gameName="ConnectDots"
          subtitle="Chi ha collegato più pallini"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { connected?: number; wrong?: number; elapsedMs?: number; done?: boolean };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: p.done
                ? { label: "Tempo", value: `${((p.elapsedMs ?? 0) / 1000).toFixed(1)}s`, tone: "good" }
                : { label: "Fatti", value: `${p.connected ?? 0}/${TOTAL}` },
              metrics: [{ icon: "❌", label: "Errori", value: `${p.wrong ?? 0}`, tone: "muted" }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-3">Tocca in ordine da <b className="text-primary">1</b> a <b>{TOTAL}</b>. Prossimo: <b className="text-accent text-lg">{done ? "✓" : next}</b></div>
        <div className="relative w-full aspect-square rounded-2xl bg-card border border-border overflow-hidden">
          {dots.map((d) => {
            const state = d.n < next ? "done" : d.n === next ? "next" : "future";
            return (
              <button
                key={d.n}
                onClick={() => tap(d.n)}
                disabled={submitted || done}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full font-black text-sm transition-all active:scale-90 ${
                  state === "done" ? "bg-emerald-500 text-white" :
                  state === "next" ? "bg-primary text-primary-foreground shadow-neon animate-pulse" :
                  "bg-secondary text-secondary-foreground border border-border"
                }`}
              >
                {d.n}
              </button>
            );
          })}
        </div>
      </div>
    </RoundShell>
  );
}
