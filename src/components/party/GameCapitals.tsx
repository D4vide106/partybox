import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreCapitals, GAME_META } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameCapitals(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const cfg = props.round.config as { country: string; flag: string; capital: string; options: string[] };
  const [pick, setPick] = useState<string | null>(null);
  const [t0] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  async function choose(opt: string) {
    if (submitted || pick !== null) return;
    setPick(opt);
    setSubmitting(true);
    const elapsedMs = Date.now() - t0;
    const durationMs = (props.room.settings?.roundDurationSec ?? GAME_META.capitals.durationSec) * 1000;
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { pick: opt, correct: opt === cfg.capital },
      points: scoreCapitals(opt === cfg.capital, elapsedMs, durationMs),
    });
    setSubmitting(false);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting || pick !== null) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { pick: null, correct: false },
        points: 0,
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
          gameEmoji="🗺️"
          gameName="Capitals"
          subtitle={`Capitale di ${cfg.country}: ${cfg.capital}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { pick?: string | null; correct?: boolean };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: p.correct
                ? { label: "Risposta", value: "✓", tone: "good" }
                : { label: "Risposta", value: p.pick ?? "—", tone: "bad" },
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-2">Qual è la capitale di</div>
        <div className="text-4xl font-black mb-1">{cfg.flag} {cfg.country}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Scegli l'opzione giusta</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cfg.options.map((o) => (
            <button
              key={o}
              onClick={() => choose(o)}
              disabled={submitted || pick !== null}
              className={`rounded-2xl py-4 px-3 text-lg font-black transition-all active:scale-95 ${
                pick === o
                  ? o === cfg.capital
                    ? "bg-emerald-500 text-white"
                    : "bg-rose-500 text-white"
                  : "bg-card border border-border hover:bg-card/70"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    </RoundShell>
  );
}
