import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreReaction } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

type Phase = "wait" | "go" | "done" | "toosoon";

export function GameReaction(props: GameProps) {
  const { phase: roundPhase, mySub, subs } = useRoundLifecycle(props);
  const [state, setState] = useState<Phase>("wait");
  const [ms, setMs] = useState<number | null>(null);
  const goAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  useEffect(() => {
    // Schedule the "go" between 1.5s and 5s after mount
    const delay = 1500 + Math.random() * 3500;
    timerRef.current = setTimeout(() => {
      goAtRef.current = performance.now();
      setState("go");
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (roundPhase !== "results" || submitted || submitting) return;
    // Time expired without a tap: submit as null (0 pts)
    void submit(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundPhase]);

  async function submit(reactionMs: number | null) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const points = scoreReaction(reactionMs);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { ms: reactionMs },
      points,
    });
    setSubmitting(false);
  }

  function onTap() {
    if (submitted || state === "done") return;
    if (state === "wait") {
      // Too soon — penalize
      if (timerRef.current) clearTimeout(timerRef.current);
      setState("toosoon");
      setMs(null);
      void submit(null);
      return;
    }
    if (state === "go") {
      const now = performance.now();
      const elapsed = Math.max(0, Math.round(now - (goAtRef.current ?? now)));
      setMs(elapsed);
      setState("done");
      void submit(elapsed);
    }
  }

  const bg =
    state === "wait" ? "bg-red-600" :
    state === "go" ? "bg-green-500" :
    state === "toosoon" ? "bg-orange-500" :
    "bg-primary";

  const label =
    state === "wait" ? "ASPETTA…" :
    state === "go" ? "TAP ORA!" :
    state === "toosoon" ? "TROPPO PRESTO!" :
    submitted ? "✅ Inviato" : "…";

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🚦"
          gameName="Reaction"
          subtitle="Vince il tempo più basso"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const rms = (s.payload as { ms?: number | null }).ms ?? null;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: rms == null
                ? { label: "Anticipo", value: "—", tone: "bad" }
                : { label: "Reazione", value: `${rms} ms`, tone: rms < 300 ? "good" : "default" },
              note: rms == null ? "Troppo presto o nessun tap" : undefined,
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-4">
          Aspetta il <b className="text-green-400">VERDE</b>, poi tap. Se tappi sul rosso perdi il round.
        </div>
        <button
          disabled={submitted && state !== "go"}
          onClick={onTap}
          className={`w-full aspect-square max-w-sm mx-auto rounded-full ${bg} text-white text-3xl font-black shadow-neon active:scale-95 transition-transform disabled:opacity-40`}
        >
          {label}
          {state === "done" && ms !== null && (
            <div className="text-xl font-black tabular-nums mt-2">{ms} ms</div>
          )}
        </button>
      </div>
    </RoundShell>
  );
}
