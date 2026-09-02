import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAME_META, normalizeFlagGuess, scoreFlagGuess } from "@/lib/party/games";
import { getSyncedServerNowMs } from "@/lib/party/hooks";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";

export function GameFlagGuess(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const cfg = props.round.config as { flag?: string; answers?: string[] };
  const flag = cfg.flag ?? "🏳️";
  const answers = cfg.answers ?? [];
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitted = !!mySub;
  const startedAt = useMemo(() => new Date(props.round.started_at).getTime(), [props.round.started_at]);
  const durationMs = GAME_META.flagguess.durationSec * 1000;

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void submit(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function isCorrect(guess: string) {
    const g = normalizeFlagGuess(guess);
    if (!g) return false;
    return answers.some((a) => normalizeFlagGuess(a) === g);
  }

  async function submit(g: string) {
    if (submitted || submitting) return;
    setSubmitting(true);
    const elapsed = Math.max(0, (await getSyncedServerNowMs()) - startedAt);
    const ok = isCorrect(g);
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { guess: g.trim(), correct: ok, elapsedMs: elapsed },
      points: scoreFlagGuess(ok, elapsed, durationMs),
    });
    setSubmitting(false);
  }

  // Auto-submit on correct
  useEffect(() => {
    if (!submitted && !submitting && isCorrect(input)) void submit(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🌍"
          gameName="FlagGuess"
          subtitle={`${flag} · Risposta: ${answers[0] ?? "—"}`}
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const pl = s.payload as { guess?: string; correct?: boolean; elapsedMs?: number };
            const t = ((pl.elapsedMs ?? 0) / 1000).toFixed(1);
            return {
              playerId: s.player_id,
              points: s.points,
              primary: pl.correct
                ? { label: "Tempo", value: `${t}s`, tone: "good" }
                : { label: "Errato", value: "❌", tone: "bad" },
              note: pl.correct
                ? undefined
                : `Ha detto: "${pl.guess || "—"}"`,
              metrics: pl.correct ? [{ icon: "✅", label: "Esatto", value: "sì", tone: "good" }] : [],
            };
          })}
        />
      }
    >
      <div className="max-w-md mx-auto pt-4 text-center">
        <div className="text-sm text-muted-foreground mb-4">Che paese è?</div>
        <div className="rounded-3xl bg-card p-8 mb-4">
          <div className="text-[9rem] leading-none animate-bounce-in">{flag}</div>
        </div>
        <input
          type="text"
          autoFocus
          disabled={submitted}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nome del paese…"
          className="w-full rounded-2xl bg-input border border-border p-4 text-xl font-bold text-center outline-none focus:ring-2 focus:ring-primary capitalize"
        />
        <button
          onClick={() => submit(input)}
          disabled={submitted || !input}
          className="mt-3 w-full rounded-2xl bg-primary text-primary-foreground text-lg font-black py-4 shadow-neon disabled:opacity-40"
        >
          {submitted ? "✅ Inviato" : "Invia"}
        </button>
      </div>
    </RoundShell>
  );
}
