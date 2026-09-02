import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, makeFindPair, scoreFindPair } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameFindPair(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const { emojis, pair } = useMemo(() => makeFindPair(seed), [seed]);
  const [t0] = useState(() => Date.now());
  const [picks, setPicks] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  function tap(i: number) {
    if (submitted || found) return;
    if (picks.includes(i)) return;
    const next = [...picks, i];
    if (next.length === 2) {
      const [a, b] = next as [number, number];
      const isPair = (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]);
      if (isPair) {
        setPicks(next);
        setFound(true);
      } else {
        setWrong((w) => w + 1);
        setTimeout(() => setPicks([]), 400);
        setPicks(next);
      }
    } else {
      setPicks(next);
    }
  }

  async function submit() {
    setSubmitting(true);
    const elapsedMs = Date.now() - t0;
    const durationMs = (props.room.settings?.roundDurationSec ?? GAME_META.findpair.durationSec) * 1000;
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { found, wrong, elapsedMs },
      points: found ? Math.max(0, scoreFindPair(true, elapsedMs, durationMs) - wrong * 60) : 0,
    });
    setSubmitting(false);
  }

  useEffect(() => {
    if (!found || submitted || submitting) return;
    void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);
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
          gameEmoji="👥"
          gameName="FindPair"
          subtitle="Chi ha trovato la coppia più in fretta"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { found?: boolean; wrong?: number; elapsedMs?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: p.found
                ? { label: "Tempo", value: `${((p.elapsedMs ?? 0) / 1000).toFixed(1)}s`, tone: "good" }
                : { label: "Esito", value: "Non trovata", tone: "bad" },
              metrics: [{ icon: "❌", label: "Errori", value: `${p.wrong ?? 0}`, tone: "muted" }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-3">Trova le <b>2 emoji uguali</b>. Errori: <b className="text-rose-400">{wrong}</b></div>
        <div className="grid grid-cols-5 gap-2">
          {emojis.map((e, i) => {
            const picked = picks.includes(i);
            const isFound = found && (i === pair[0] || i === pair[1]);
            return (
              <button
                key={i}
                onClick={() => tap(i)}
                disabled={submitted || found}
                className={`aspect-square rounded-xl text-3xl transition-all active:scale-95 ${
                  isFound ? "bg-emerald-500/40 ring-2 ring-emerald-400" :
                  picked ? "bg-primary/30 ring-2 ring-primary" :
                  "bg-card border border-border hover:bg-card/70"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
        {found && <div className="mt-4 text-emerald-400 font-black">✅ Coppia trovata!</div>}
      </div>
    </RoundShell>
  );
}
