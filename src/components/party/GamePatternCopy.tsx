import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { makePattern, scorePatternCopy } from "@/lib/party/games";
import { useSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

const SHOW_MS = 3500;

export function GamePatternCopy(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const seed = (props.round.config as { seed?: number }).seed ?? 1;
  const startedAt = useMemo(() => new Date(props.round.started_at ?? Date.now()).getTime(), [props.round.started_at]);
  const pattern = useMemo(() => makePattern(seed), [seed]);
  const now = useSyncedServerNowMs();
  const showing = now - startedAt < SHOW_MS;

  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;

  const target = pattern.filter(Boolean).length;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      const correct = [...picked].filter((i) => pattern[i]).length;
      const wrong = picked.size - correct;
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { correct, wrong, total: target },
        points: scorePatternCopy(correct, wrong, target),
      });
      setSubmitting(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function toggle(i: number) {
    if (showing || locked || submitted) return;
    setPicked((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  }
  async function confirm() {
    if (submitted || submitting) return;
    setLocked(true);
    setSubmitting(true);
    const correct = [...picked].filter((i) => pattern[i]).length;
    const wrong = picked.size - correct;
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { correct, wrong, total: target },
      points: scorePatternCopy(correct, wrong, target),
    });
    setSubmitting(false);
  }

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🟪"
          gameName="PatternCopy"
          subtitle={`Celle da ricopiare: ${target}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { correct?: number; wrong?: number; total?: number };
            const c = pl.correct ?? 0;
            const w = pl.wrong ?? 0;
            const t = pl.total ?? target;
            const perfect = c === t && w === 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: {
                label: "Celle",
                value: `${c}/${t}`,
                tone: perfect ? "good" : c === 0 ? "bad" : "default",
              },
              metrics: [
                { icon: "❌", label: "Fuori", value: `${w}`, tone: w > 0 ? "bad" : "muted" },
                ...(perfect ? [{ icon: "⭐", label: "Bonus", value: "perfetto", tone: "good" as const }] : []),
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-3">
          {showing ? "👀 Memorizza le celle accese!" : `Ricopia lo schema (${target} celle)`}
        </div>
        <div className="grid grid-cols-3 gap-3 aspect-square mb-4">
          {Array.from({ length: 9 }, (_, i) => {
            const isLit = pattern[i];
            const isPicked = picked.has(i);
            const shown = showing && isLit;
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                disabled={showing || locked || submitted}
                className={`rounded-2xl transition-all
                  ${shown ? "bg-pink-500 shadow-neon scale-105"
                    : isPicked ? "bg-purple-600 shadow-neon"
                    : "bg-card hover:bg-card/70"}`}
              />
            );
          })}
        </div>
        <button
          onClick={confirm}
          disabled={showing || submitted || locked}
          className="w-full rounded-2xl bg-accent text-accent-foreground font-black py-4 shadow-neon-yellow disabled:opacity-40"
        >
          {submitted ? "Bloccato ✓" : "🔒 Conferma"}
        </button>
      </div>
    </RoundShell>
  );
}
