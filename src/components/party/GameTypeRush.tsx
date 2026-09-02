import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreTypeRush } from "@/lib/party/games";
import { getSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameTypeRush(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const phrase = (props.round.config as { phrase?: string }).phrase ?? "";
  const [typed, setTyped] = useState("");
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submitted = !!mySub;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(typed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const correctChars = useMemo(() => {
    let c = 0;
    for (let i = 0; i < typed.length && i < phrase.length; i++) {
      if (typed[i] === phrase[i]) c++;
    }
    return c;
  }, [typed, phrase]);

  async function submit(finalTyped: string) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
    let cc = 0;
    for (let i = 0; i < finalTyped.length && i < phrase.length; i++) if (finalTyped[i] === phrase[i]) cc++;
    const points = scoreTypeRush(cc, phrase.length, elapsed);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { typed: finalTyped, correct: cc, total: phrase.length, elapsedMs: elapsed },
      points,
    });
    setSubmitting(false);
  }

  // Auto-submit if phrase completed exactly
  useEffect(() => {
    if (typed === phrase && !submitted && !submitting) void submit(typed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, phrase]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="⌨️"
          gameName="TypeRush"
          subtitle="Precisione + velocità"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { correct?: number; total?: number; elapsedMs?: number };
            const c = pl.correct ?? 0;
            const t = pl.total ?? 0;
            const ms = pl.elapsedMs ?? 0;
            const acc = t > 0 ? Math.round((c / t) * 100) : 0;
            const wpm = ms > 0 ? Math.round((c / 5) / (ms / 60000)) : 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Corretti", value: `${c}/${t}` },
              metrics: [
                { icon: "🎯", label: "Precisione", value: `${acc}%`, tone: acc >= 95 ? "good" : "default" },
                { icon: "⏱", label: "Tempo", value: `${(ms / 1000).toFixed(1)}s` },
                { icon: "🚀", label: "WPM", value: `${wpm}` },
              ],
            };
          })}
        />
      }
    >
      <div className="max-w-2xl mx-auto pt-4">
        <div className="text-sm text-muted-foreground text-center mb-3">Scrivi questa frase esattamente:</div>
        <div className="rounded-2xl bg-card p-5 mb-4 text-lg font-mono leading-relaxed">
          {phrase.split("").map((c, i) => {
            const t = typed[i];
            const status = t === undefined ? "pending" : t === c ? "ok" : "bad";
            return (
              <span
                key={i}
                className={
                  status === "ok" ? "text-accent" :
                  status === "bad" ? "text-destructive bg-destructive/20 rounded" :
                  "text-muted-foreground"
                }
              >
                {c}
              </span>
            );
          })}
        </div>
        <textarea
          ref={inputRef}
          disabled={submitted}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          rows={3}
          className="w-full rounded-2xl bg-input border border-border p-4 text-base font-mono resize-none outline-none focus:ring-2 focus:ring-primary"
          placeholder="Inizia a scrivere…"
        />
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{correctChars}/{phrase.length} caratteri corretti</span>
          <button
            onClick={() => submit(typed)}
            disabled={submitted}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2 font-bold shadow-neon disabled:opacity-40"
          >
            {submitted ? "✅ Inviato" : "Invia"}
          </button>
        </div>
      </div>
    </RoundShell>
  );
}
