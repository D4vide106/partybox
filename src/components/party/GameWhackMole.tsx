import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeMoleTick, scoreWhackMole } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameWhackMole(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [tick, setTick] = useState(0);
  const [hits, setHits] = useState(0);
  const [bombs, setBombs] = useState(0);
  const [status, setStatus] = useState<Record<number, "ok" | "bad">>({});
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const current = makeMoleTick(seed, tick);

  useEffect(() => {
    if (submitted || phase !== "playing") return;
    const t = setInterval(() => setTick((x) => x + 1), 900);
    return () => clearInterval(t);
  }, [submitted, phase]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { hits, bombs },
        points: scoreWhackMole(hits, bombs),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function hit(cell: number) {
    if (submitted) return;
    if (cell !== current.cell) return;
    if (current.isBomb) {
      setBombs((b) => b + 1);
      setStatus((s) => ({ ...s, [cell]: "bad" }));
    } else {
      setHits((h) => h + 1);
      setStatus((s) => ({ ...s, [cell]: "ok" }));
    }
    setTick((x) => x + 1);
    setTimeout(() => setStatus((s) => { const n = { ...s }; delete n[cell]; return n; }), 250);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🔨"
          gameName="WhackMole"
          subtitle="Talpe sì, bombe no"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { hits?: number; bombs?: number };
            const h = pl.hits ?? 0;
            const b = pl.bombs ?? 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Talpe", value: `${h}` },
              metrics: [
                { icon: "💣", label: "Bombe", value: `${b}`, tone: b > 0 ? "bad" : "muted" },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-2">Colpisci le 🐹 — NON le 💣</div>
        <div className="flex justify-center gap-6 mb-3 text-lg font-black">
          <span className="text-amber-400">🔨 {hits}</span>
          <span className="text-red-400">💣 {bombs}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }, (_, i) => {
            const active = current.cell === i;
            const st = status[i];
            return (
              <button
                key={i}
                onClick={() => hit(i)}
                className={`aspect-square rounded-2xl text-5xl transition-all
                  ${st === "ok" ? "bg-green-500 scale-95"
                    : st === "bad" ? "bg-red-500 scale-95"
                    : active ? "bg-amber-700 shadow-neon-yellow"
                    : "bg-card"}`}
              >
                {active ? (current.isBomb ? "💣" : "🐹") : "·"}
              </button>
            );
          })}
        </div>
      </div>
    </RoundShell>
  );
}
