import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scoreSnake } from "@/lib/party/games";
import { RankedResults, type ResultRow } from "@/components/party/RankedResults";
import { RoundShell, useRoundLifecycle, type GameProps } from "./GameShell";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";

const GRID = 14;
type Cell = { x: number; y: number };
type Dir = "U" | "D" | "L" | "R";

function randCell(occupied: Cell[]): Cell {
  for (let attempts = 0; attempts < 40; attempts++) {
    const c = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!occupied.some((o) => o.x === c.x && o.y === c.y)) return c;
  }
  return { x: 0, y: 0 };
}

export function GameSnake(props: GameProps) {
  const { phase, mySub, subs } = useRoundLifecycle(props);
  const [snake, setSnake] = useState<Cell[]>([{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }]);
  const [dir, setDir] = useState<Dir>("R");
  const [apple, setApple] = useState<Cell>({ x: 10, y: 7 });
  const [apples, setApples] = useState(0);
  const [dead, setDead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dirRef = useRef<Dir>("R");
  const submitted = !!mySub;

  const setDirection = useCallback((d: Dir) => {
    const opp: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };
    if (opp[d] === dirRef.current) return;
    dirRef.current = d;
    setDir(d);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp") setDirection("U");
      else if (e.key === "ArrowDown") setDirection("D");
      else if (e.key === "ArrowLeft") setDirection("L");
      else if (e.key === "ArrowRight") setDirection("R");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDirection]);

  useEffect(() => {
    if (submitted || dead) return;
    const id = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0]!;
        const d = dirRef.current;
        const nh: Cell = {
          x: head.x + (d === "R" ? 1 : d === "L" ? -1 : 0),
          y: head.y + (d === "D" ? 1 : d === "U" ? -1 : 0),
        };
        if (nh.x < 0 || nh.x >= GRID || nh.y < 0 || nh.y >= GRID) { setDead(true); return prev; }
        if (prev.some((c) => c.x === nh.x && c.y === nh.y)) { setDead(true); return prev; }
        const ate = nh.x === apple.x && nh.y === apple.y;
        const next = [nh, ...prev];
        if (!ate) next.pop();
        else {
          setApples((a) => a + 1);
          setApple(randCell(next));
        }
        return next;
      });
    }, 180);
    return () => clearInterval(id);
  }, [apple, submitted, dead]);

  useEffect(() => {
    if (phase !== "results" || submitted || submitting) return;
    void (async () => {
      setSubmitting(true);
      await supabase.from("submissions").insert({
        round_id: props.round.id,
        player_id: props.me.id,
        payload: { apples },
        points: scoreSnake(apples),
      });
      setSubmitting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const cellSize = 22;
  return (
    <RoundShell
      props={props}
      results={
        <RankedResults
          gameEmoji="🐍"
          gameName="Snake"
          subtitle="Chi ha mangiato più mele"
          meId={props.me.id}
          players={props.players}
          rows={subs.map((s): ResultRow => {
            const a = (s.payload as { apples?: number }).apples ?? 0;
            return {
              playerId: s.player_id,
              points: s.points,
              primary: { label: "Mele", value: `${a}`, tone: a >= 6 ? "good" : "default" },
            };
          })}
        />
      }
    >
      <div className="max-w-sm mx-auto pt-2 text-center select-none">
        <div className="text-sm text-muted-foreground mb-2">Frecce o pulsanti: mangia 🍎, evita muri e coda</div>
        <div className="text-3xl font-black text-primary mb-2 tabular-nums">🍎 {apples}</div>
        <div
          className="relative mx-auto rounded-xl bg-card border border-border overflow-hidden"
          style={{ width: GRID * cellSize, height: GRID * cellSize }}
        >
          {snake.map((c, i) => (
            <div
              key={i}
              className={`absolute rounded-sm ${i === 0 ? "bg-emerald-400" : "bg-emerald-600"}`}
              style={{ left: c.x * cellSize, top: c.y * cellSize, width: cellSize - 2, height: cellSize - 2 }}
            />
          ))}
          <div
            className="absolute grid place-items-center"
            style={{ left: apple.x * cellSize, top: apple.y * cellSize, width: cellSize, height: cellSize }}
          >🍎</div>
          {dead && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-white font-black text-xl">
              💀 GAME OVER
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 w-40 mx-auto">
          <div />
          <button onClick={() => setDirection("U")} className="rounded-lg bg-secondary p-3 active:scale-95"><ArrowUp className="h-5 w-5 mx-auto" /></button>
          <div />
          <button onClick={() => setDirection("L")} className="rounded-lg bg-secondary p-3 active:scale-95"><ArrowLeft className="h-5 w-5 mx-auto" /></button>
          <button onClick={() => setDirection("D")} className="rounded-lg bg-secondary p-3 active:scale-95"><ArrowDown className="h-5 w-5 mx-auto" /></button>
          <button onClick={() => setDirection("R")} className="rounded-lg bg-secondary p-3 active:scale-95"><ArrowRight className="h-5 w-5 mx-auto" /></button>
        </div>
        {void dir}
      </div>
    </RoundShell>
  );
}
