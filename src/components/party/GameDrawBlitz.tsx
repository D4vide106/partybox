import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreDrawBlitz } from "@/lib/party/games";
import { getSyncedServerNowMs, useCountdown, useSubmissions } from "@/lib/party/hooks";
import { GAME_META, type GameType } from "@/lib/party/games";
import { RoundHeader } from "./RoundHeader";
import type { GameProps } from "./GameShell";
import { AvatarMark } from "./AvatarMark";

/**
 * DrawBlitz has two phases: draw (30s) and vote (variable).
 * We use round.config.phase to switch. Host advances draw→vote when timer expires
 * or all players submitted, and vote→done when all votes received.
 */
export function GameDrawBlitz(props: GameProps) {
  const config = props.round.config as { prompt?: string; phase?: "draw" | "vote" };
  const phase = config.phase ?? "draw";

  if (phase === "vote") return <VotePhase {...props} />;
  return <DrawPhase {...props} />;
}

// Professional 24-color palette — curated across neutrals, warm, cool, accent.
// Rows read left→right as tonal families, inspired by Copic/Pantone workflows.
const PALETTE: string[] = [
  // Neutrals
  "#0f172a", "#334155", "#64748b", "#cbd5e1", "#f8fafc", "#ffffff",
  // Reds / pinks
  "#7f1d1d", "#dc2626", "#f97373", "#fb923c", "#ec4899", "#f9a8d4",
  // Yellows / greens
  "#b45309", "#f59e0b", "#facc15", "#84cc16", "#22c55e", "#065f46",
  // Blues / purples
  "#0e7490", "#0ea5e9", "#3b82f6", "#4338ca", "#8b5cf6", "#a855f7",
];
const BRUSH_SIZES = [2, 5, 10, 18, 30];


function DrawPhase(props: GameProps) {
  const prompt = (props.round.config as { prompt?: string }).prompt ?? "";
  const remaining = useCountdown(props.round.ends_at, props.round.started_at);
  const subs = useSubmissions(props.round.id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState<string>("#0f172a");
  const [size, setSize] = useState(5);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [submitted, setSubmitted] = useState(false);
  const historyRef = useRef<ImageData[]>([]);
  const [historyLen, setHistoryLen] = useState(0);

  const meta = GAME_META[props.round.game_type as GameType];

  const mySub = subs.find((s) => s.player_id === props.me.id);
  useEffect(() => { if (mySub) setSubmitted(true); }, [mySub]);

  // Setup canvas white bg
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  }
  function pushHistory() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const snap = ctx.getImageData(0, 0, c.width, c.height);
    const stack = historyRef.current;
    stack.push(snap);
    if (stack.length > 25) stack.shift();
    setHistoryLen(stack.length);
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    if (submitted) return;
    pushHistory();
    setDrawing(true);
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? size * 2.5 : size;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    // dot on tap
    ctx.lineTo(x + 0.01, y + 0.01); ctx.stroke();
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const { x, y } = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(x, y); ctx.stroke();
  }
  function end() { setDrawing(false); }

  function undo() {
    const stack = historyRef.current;
    const last = stack.pop();
    setHistoryLen(stack.length);
    if (!last) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.putImageData(last, 0, 0);
  }

  function clear() {
    if (submitted) return;
    pushHistory();
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  }

  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitted || submitting) return;
    setSubmitting(true);
    const url = canvasRef.current!.toDataURL("image/png");
    await supabase.from("submissions").insert({
      round_id: props.round.id,
      player_id: props.me.id,
      payload: { image: url, votes: [] },
      points: 0,
    });
    setSubmitted(true);
    setSubmitting(false);
  }

  // Auto-submit on time up
  useEffect(() => {
    if (remaining === 0 && !submitted && !submitting) void submit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  // Host advances to vote phase
  const allDone = props.players.length > 0 && subs.length >= props.players.length;
  useEffect(() => {
    if (!props.isHost) return;
    if (remaining > 0 && !allDone) return;
    if ((props.round.config as { phase?: string }).phase === "vote") return;
    const t = setTimeout(async () => {
      const serverNowMs = await getSyncedServerNowMs(true);
      const votingStarted = new Date(serverNowMs).toISOString();
      const votingEnds = new Date(serverNowMs + 30_000).toISOString();
      await supabase.from("rounds").update({
        config: { ...(props.round.config as object), phase: "vote" },
        started_at: votingStarted,
        ends_at: votingEnds,
      }).eq("id", props.round.id);
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, allDone, props.isHost]);

  return (
    <div className="min-h-screen flex flex-col">
      <RoundHeader
        roundNumber={props.round.round_number}
        totalRounds={props.room.game_sequence.length}
        gameType="drawblitz"
        meta={{ name: meta.name, tagline: meta.tagline, durationSec: meta.durationSec }}
        remaining={remaining}
        phase="playing"
        submittedCount={subs.length}
        totalPlayers={props.players.length}
      />
      <div className="flex-1 px-4 pb-4 max-w-md mx-auto w-full">
        <div className="text-center mb-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Tema</div>
          <div className="text-2xl font-black text-accent text-glow-yellow">"{prompt}"</div>
        </div>
        <canvas
          ref={canvasRef}
          width={600} height={600}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
          className="w-full aspect-square rounded-2xl bg-white touch-none shadow-neon cursor-crosshair"
          style={{ touchAction: "none" }}
        />
        {/* Palette — 6 cols × 4 rows curated */}
        <div className="mt-3 rounded-2xl bg-card/60 border border-border p-2">
          <div className="grid grid-cols-6 gap-1.5">
            {PALETTE.map((c) => {
              const isActive = color.toLowerCase() === c.toLowerCase() && tool === "brush";
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setTool("brush"); }}
                  className={`aspect-square rounded-md transition-transform ${isActive ? "ring-2 ring-accent scale-110 shadow-neon-yellow" : "ring-1 ring-black/10 hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`colore ${c}`}
                />
              );
            })}
          </div>
          {/* Custom picker + active swatch */}
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground cursor-pointer">
              <span
                className="h-6 w-6 rounded-md ring-2 ring-accent shadow-neon-yellow"
                style={{ backgroundColor: tool === "eraser" ? "#ffffff" : color }}
                aria-hidden
              />
              <span className="uppercase tracking-widest">Custom</span>
              <input
                type="color"
                value={color}
                onChange={(e) => { setColor(e.target.value); setTool("brush"); }}
                className="h-6 w-6 cursor-pointer rounded-md border border-border bg-transparent"
                aria-label="Scegli colore personalizzato"
              />
            </label>
            <span className="text-[10px] font-mono uppercase text-muted-foreground tabular-nums">
              {tool === "eraser" ? "GOMMA" : color.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tools */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {BRUSH_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`w-10 h-10 rounded-full bg-secondary flex items-center justify-center transition ${size === s ? "ring-2 ring-accent scale-110" : ""}`}
                aria-label={`pennello ${s}px`}
                title={`${s}px`}
              >
                <span
                  className="rounded-full"
                  style={{
                    width: Math.min(s, 22),
                    height: Math.min(s, 22),
                    backgroundColor: tool === "eraser" ? "#94a3b8" : color,
                  }}
                />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTool(tool === "eraser" ? "brush" : "eraser")}
              className={`ml-1 w-10 h-10 rounded-full flex items-center justify-center transition text-lg ${tool === "eraser" ? "bg-accent text-accent-foreground scale-110" : "bg-secondary"}`}
              aria-label="gomma"
              title="Gomma"
            >
              🧽
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={submitted || historyLen === 0}
              className="rounded-full bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-40"
              title="Annulla"
              aria-label="Annulla ultimo tratto"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={submitted}
              className="rounded-full bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-40"
              title="Pulisci"
              aria-label="Pulisci canvas"
            >
              🗑️
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitted}
              className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-black shadow-neon disabled:opacity-40"
            >
              {submitted ? "✅ Inviato" : "Invia"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function VotePhase(props: GameProps) {
  const prompt = (props.round.config as { prompt?: string }).prompt ?? "";
  const remaining = useCountdown(props.round.ends_at, props.round.started_at);
  const subs = useSubmissions(props.round.id);
  const meta = GAME_META[props.round.game_type as GameType];
  const mySub = subs.find((s) => s.player_id === props.me.id);
  const [voting, setVoting] = useState(false);

  const alreadyVoted = useMemo(() => {
    if (!mySub) return true;
    const votes = ((mySub.payload as { votes?: string[] }).votes ?? []);
    return votes.length > 0;
  }, [mySub]);

  const votableDrawings = subs.filter((s) => s.player_id !== props.me.id);

  async function voteFor(targetSub: typeof subs[number]) {
    if (voting || alreadyVoted || !mySub) return;
    setVoting(true);
    // Store vote in MY submission's votes[] array; recompute target points from all subs afterwards.
    const myVotes = [...((mySub.payload as { votes?: string[] }).votes ?? []), targetSub.id];
    const myPayload = { ...(mySub.payload as object), votes: myVotes };
    await supabase.from("submissions").update({ payload: myPayload }).eq("id", mySub.id);
    setVoting(false);
  }

  // Compute vote counts per submission
  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of subs) {
      const votes = ((s.payload as { votes?: string[] }).votes ?? []);
      for (const v of votes) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return counts;
  }, [subs]);

  const allVoted = subs.every((s) => {
    const v = ((s.payload as { votes?: string[] }).votes ?? []);
    return v.length > 0;
  });
  const showResults = allVoted || remaining === 0;

  // Host writes points to submissions and tallies scores once voting ends
  const [tallied, setTallied] = useState(false);
  useEffect(() => {
    if (!props.isHost || !showResults || tallied) return;
    setTallied(true);
    void (async () => {
      // Update each submission's points from votes count
      for (const s of subs) {
        const pts = scoreDrawBlitz(voteCounts.get(s.id) ?? 0);
        if (pts !== s.points) await supabase.from("submissions").update({ points: pts }).eq("id", s.id);
      }
      // Update player scores (add points)
      for (const p of props.players) {
        const s = subs.find((x) => x.player_id === p.id);
        const pts = scoreDrawBlitz(voteCounts.get(s?.id ?? "") ?? 0);
        if (pts > 0) await supabase.from("players").update({ score: p.score + pts }).eq("id", p.id);
      }
      await supabase.from("rounds").update({ status: "scoring" }).eq("id", props.round.id);
    })();
  }, [showResults, props.isHost, tallied, subs, voteCounts, props.players, props.round.id]);

  const isLastRound = props.room.current_round >= props.room.game_sequence.length;

  return (
    <div className="min-h-screen flex flex-col">
      <RoundHeader
        roundNumber={props.round.round_number}
        totalRounds={props.room.game_sequence.length}
        gameType="drawblitz"
        meta={{ name: showResults ? "DrawBlitz — risultati" : "DrawBlitz — vota", tagline: `Tema: "${prompt}"`, durationSec: meta.durationSec }}
        remaining={remaining}
        phase={showResults ? "results" : "playing"}
        submittedCount={subs.filter((s) => ((s.payload as { votes?: string[] }).votes ?? []).length > 0).length}
        totalPlayers={props.players.length}
      />
      <div className="flex-1 px-4 pb-4 max-w-2xl mx-auto w-full">
        {!showResults && (
          <div className="text-center mb-3 text-sm text-muted-foreground">
            {alreadyVoted ? "Hai già votato ✅ — in attesa degli altri" : "Vota il disegno migliore (non il tuo)"}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(showResults ? subs : votableDrawings).map((s) => {
            const p = props.players.find((x) => x.id === s.player_id);
            const img = (s.payload as { image?: string }).image;
            const votes = voteCounts.get(s.id) ?? 0;
            const isTop = showResults && [...voteCounts.values()].sort((a,b)=>b-a)[0] === votes && votes > 0;
            return (
              <button
                key={s.id}
                disabled={showResults || alreadyVoted}
                onClick={() => voteFor(s)}
                className={`rounded-2xl overflow-hidden bg-white text-left transition ${isTop ? "ring-4 ring-accent shadow-neon-yellow" : "ring-1 ring-border"} ${!showResults && !alreadyVoted ? "hover:scale-105" : ""}`}
              >
                {img ? <img src={img} alt="disegno" className="w-full aspect-square object-cover" /> : <div className="aspect-square bg-secondary" />}
                <div className="p-2 bg-card flex items-center justify-between text-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {showResults ? (
                      <>
                        <AvatarMark value={p?.avatar_emoji} label={p?.nickname} size="sm" />
                        <span className="text-sm font-bold truncate">{p?.nickname}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Anonimo</span>
                    )}
                  </div>
                  {showResults && (
                    <div className="text-sm font-black text-accent shrink-0">
                      {votes} 🗳️
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {showResults && (
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background to-transparent">
          {props.isHost ? (
            <button
              onClick={props.onAdvance}
              className="w-full max-w-md mx-auto block rounded-2xl bg-accent text-accent-foreground text-xl font-black py-5 shadow-neon-yellow animate-pulse-glow"
            >
              {isLastRound ? "🏆 Vedi classifica finale" : "➡️ Prossimo round"}
            </button>
          ) : (
            <div className="text-center text-sm text-muted-foreground font-bold">L'host sta scegliendo il prossimo round…</div>
          )}
        </div>
      )}
    </div>
  );
}
