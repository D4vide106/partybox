import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makeMemoryDigits, scoreMemoryDigits } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const SHOW_MS = 3500;

export function GameMemoryDigits(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const { digits } = useMemo(() => makeMemoryDigits(seed), [seed]);
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [input, setInput] = useState("");
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const showing = now - t0 < SHOW_MS;

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [submitted]);

  async function lockIn() {
    if (submitted || locked) return;
    setLocked(true);
    setSubmitting(true);
    const attempt = input.replace(/\D/g, "").slice(0, digits.length);
    let correct = 0;
    for (let i = 0; i < digits.length; i++) if (attempt[i] === digits[i]) correct++;
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { attempt, correct, target: digits },
      points: scoreMemoryDigits(correct, digits.length),
    });
    setSubmitting(false);
  }

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void lockIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🧠"
          gameName="MemoryDigits"
          subtitle={`Numeri: ${digits}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const p = s.payload as { attempt?: string; correct?: number };
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Corretti", value: `${p.correct ?? 0}/${digits.length}`, tone: (p.correct ?? 0) === digits.length ? "good" : "default" },
              note: p.attempt ? `Tuo: ${p.attempt}` : "—",
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-2 text-center">
        {showing ? (
          <>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">Memorizza</div>
            <div className="text-6xl sm:text-7xl font-black tabular-nums text-primary text-glow tracking-widest">{digits}</div>
            <div className="mt-4 text-sm text-muted-foreground">Nascosto tra {Math.max(0, Math.ceil((SHOW_MS - (now - t0)) / 1000))}s…</div>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-bold">Riscrivi i {digits.length} numeri</div>
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={digits.length}
              value={input}
              disabled={submitted || locked}
              onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") void lockIn(); }}
              className="w-full text-center text-5xl font-black tabular-nums tracking-widest rounded-2xl bg-card border border-border py-4 mb-4 outline-none focus:border-primary"
            />
            <button
              onClick={lockIn}
              disabled={submitted || locked || input.length === 0}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-4 font-black shadow-neon active:scale-95 disabled:opacity-40"
            >
              {locked ? "✅ Inviato" : "Conferma"}
            </button>
          </>
        )}
      </div>
    </RoundShell>
  );
}
