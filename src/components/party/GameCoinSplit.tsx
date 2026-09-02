import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeCoinSplit, scoreCoinSplit } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

type Side = "L" | "R" | null;

export function GameCoinSplit(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const [idx, setIdx] = useState(0);
  const [assigns, setAssigns] = useState<Side[]>([null, null, null, null, null, null]);
  const [solved, setSolved] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const round = useMemo(() => makeCoinSplit(seed, idx), [seed, idx]);
  const submitted = !!mySub;

  // Reset assigns on new round
  useEffect(() => { setAssigns([null, null, null, null, null, null]); }, [idx]);

  function cycle(i: number) {
    if (submitted) return;
    setAssigns((prev) => {
      const next = [...prev];
      next[i] = prev[i] === null ? "L" : prev[i] === "L" ? "R" : null;
      return next;
    });
  }

  const sumL = round.coins.reduce((s, c, i) => s + (assigns[i] === "L" ? c : 0), 0);
  const sumR = round.coins.reduce((s, c, i) => s + (assigns[i] === "R" ? c : 0), 0);
  const total = round.coins.reduce((s, c) => s + c, 0);
  const allAssigned = assigns.every((a) => a !== null);
  const balanced = allAssigned && sumL === sumR;

  function confirm() {
    if (submitted) return;
    if (!allAssigned) return;
    if (balanced) setSolved((v) => v + 1);
    else setWrong((v) => v + 1);
    setIdx((v) => v + 1);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { solved, wrong },
        points: scoreCoinSplit(solved, wrong),
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
          gameEmoji="⚖️"
          gameName="CoinSplit"
          subtitle="Pile bilanciate risolte"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { solved?: number; wrong?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Risolti", value: `${p.solved ?? 0}`, tone: "good" },
              metrics: [{ icon: "❌", label: "Sbagliati", value: `${p.wrong ?? 0}`, tone: "muted" }],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        <div className="text-sm text-muted-foreground mb-2">Assegna ogni moneta (tap: L → R → nulla). Totale = <b>{total}</b>, obiettivo per pila = <b className="text-primary">{total / 2}</b></div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className={`rounded-2xl border py-3 ${sumL === total / 2 && allAssigned ? "bg-emerald-500/15 border-emerald-500" : "bg-card border-border"}`}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Sinistra</div>
            <div className="text-3xl font-black tabular-nums text-primary">{sumL}</div>
          </div>
          <div className={`rounded-2xl border py-3 ${sumR === total / 2 && allAssigned ? "bg-emerald-500/15 border-emerald-500" : "bg-card border-border"}`}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Destra</div>
            <div className="text-3xl font-black tabular-nums text-primary">{sumR}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {round.coins.map((c, i) => (
            <button
              key={i}
              onClick={() => cycle(i)}
              disabled={submitted}
              className={`rounded-xl py-5 text-xl font-black transition-all active:scale-95 ${
                assigns[i] === "L" ? "bg-sky-500 text-white" :
                assigns[i] === "R" ? "bg-fuchsia-500 text-white" :
                "bg-card border border-border"
              }`}
            >
              <div>{c}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{assigns[i] ?? "—"}</div>
            </button>
          ))}
        </div>
        <button
          onClick={confirm}
          disabled={submitted || !allAssigned}
          className={`w-full rounded-2xl py-4 font-black text-lg shadow-neon active:scale-95 disabled:opacity-40 ${
            balanced ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
          }`}
        >
          {balanced ? "✅ Bilanciato! Prossimo" : allAssigned ? "❌ Non bilanciato — invia" : "Assegna tutte le monete"}
        </button>
        <div className="mt-3 text-sm">
          <span className="text-emerald-400 font-black">✓ {solved}</span>
          <span className="mx-3 text-muted-foreground">·</span>
          <span className="text-rose-400 font-black">✗ {wrong}</span>
        </div>
      </div>
    </RoundShell>
  );
}
