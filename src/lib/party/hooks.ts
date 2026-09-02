import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// -------- Types (mirrors public.* tables) --------

export type RoomSettings = {
  /** Override in seconds. 0 or undefined = use per-game default. */
  roundDurationSec?: number;
  /** 0..100 — percentage of active players required to kick. */
  votekickThresholdPct?: number;
  /** true = allow duplicate mini-games across the sequence (default true). */
  allowRepeatGames?: boolean;
  /** Pause between rounds in seconds (default 4). */
  intermissionSec?: number;
  /** If true, the host doesn't need to press "next" — round auto-advances after intermission. */
  autoAdvance?: boolean;
  /** Minimum active players to start (default 2). */
  minPlayersToStart?: number;
  /** Enable in-room chat (default true). */
  chatEnabled?: boolean;
  /** Difficulty multiplier for time-based games. */
  difficulty?: "easy" | "normal" | "hard";
  /** Monopoly: starting cash (default 1500). */
  monopolyStartCash?: number;
  /** Monopoly: bonus when passing GO (default 200). */
  monopolyGoBonus?: number;
  /** Monopoly: bail fee to leave jail (default 50). */
  monopolyJailFee?: number;
  /** Selected game category id (drives which mini-games are queued). */
  gameCategory?: string;
};

export type Room = {
  id: string;
  code: string;
  host_client_id: string;
  status: "lobby" | "playing" | "finished";
  current_round: number;
  game_sequence: string[];
  created_at: string;
  updated_at: string;
  settings: RoomSettings;
  disconnect_timeout_sec: number;
  used_pool: Record<string, number[]>;
};

export type Player = {
  id: string;
  room_id: string;
  client_id: string;
  nickname: string;
  avatar_emoji: string;
  score: number;
  is_host: boolean;
  joined_at: string;
  last_seen_at: string;
  is_connected: boolean;
  kicked: boolean;
  left_at: string | null;
};

export type Round = {
  id: string;
  room_id: string;
  round_number: number;
  game_type: string;
  status: "active" | "scoring" | "done";
  config: Record<string, unknown>;
  started_at: string;
  ends_at: string | null;
};

export type Submission = {
  id: string;
  round_id: string;
  player_id: string;
  payload: Record<string, unknown>;
  points: number;
  created_at: string;
};

export type PlayerVote = {
  id: string;
  room_id: string;
  voter_id: string;
  target_id: string;
  created_at: string;
};

// -------- Helpers to normalize DB rows into typed shapes --------

function normalizeRoom(row: unknown): Room | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id),
    code: String(r.code),
    host_client_id: String(r.host_client_id),
    status: (r.status as Room["status"]) ?? "lobby",
    current_round: Number(r.current_round ?? 0),
    game_sequence: Array.isArray(r.game_sequence) ? (r.game_sequence as string[]) : [],
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
    settings: (r.settings && typeof r.settings === "object" ? r.settings : {}) as RoomSettings,
    disconnect_timeout_sec: Number(r.disconnect_timeout_sec ?? 25),
    used_pool: (r.used_pool && typeof r.used_pool === "object" ? r.used_pool : {}) as Record<string, number[]>,
  };
}

// -------- Rooms --------

export function useRoom(code: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    let active = true;

    async function load() {
      const { data } = await supabase.from("rooms").select("*").eq("code", code!).maybeSingle();
      if (!active) return;
      setRoom(normalizeRoom(data));
      setLoading(false);
    }
    void load();
    const poll = setInterval(() => void load(), 1500);

    const channel = supabase
      .channel(`room-${code}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, (p) => {
        if (p.eventType === "DELETE") setRoom(null);
        else setRoom(normalizeRoom(p.new));
      })
      .subscribe();

    return () => { active = false; clearInterval(poll); void supabase.removeChannel(channel); };
  }, [code]);

  return { room, loading };
}

// -------- Players (ordered by joined_at) --------

export function usePlayers(roomId: string | undefined) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!roomId) return;
    let active = true;

    async function load() {
      const { data } = await supabase.from("players").select("*").eq("room_id", roomId!).order("joined_at");
      if (!active) return;
      setPlayers((data ?? []) as Player[]);
    }
    void load();

    const channel = supabase
      .channel(`players-${roomId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, () => {
        void load();
      })
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, [roomId]);

  return players;
}

/** Active = connected + not kicked + not left. Used for gameplay + votekick math. */
export function activePlayers(list: Player[]): Player[] {
  return list.filter((p) => !p.kicked && p.is_connected && !p.left_at);
}

/** Bots are dev/test placeholders — identified by client_id prefix. */
export function isBot(p: Pick<Player, "client_id">): boolean {
  return p.client_id.startsWith("bot:");
}

/** All players ever seen — includes kicked/left/disconnected (member history). */
export function allMembers(list: Player[]): Player[] {
  return list;
}

// -------- Current round --------

export function useCurrentRound(roomId: string | undefined, roundNumber: number) {
  const [round, setRound] = useState<Round | null>(null);

  useEffect(() => {
    if (!roomId || roundNumber < 1) { setRound(null); return; }
    let active = true;
    setRound(null);

    async function load() {
      const { data } = await supabase
        .from("rounds")
        .select("*")
        .eq("room_id", roomId!)
        .eq("round_number", roundNumber)
        .maybeSingle();
      if (!active) return;
      setRound(data as Round | null);
    }
    void load();
    const poll = setInterval(() => void load(), 1000);

    const channel = supabase
      .channel(`round-${roomId}-${roundNumber}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` }, () => {
        void load();
      })
      .subscribe();

    return () => { active = false; clearInterval(poll); void supabase.removeChannel(channel); };
  }, [roomId, roundNumber]);

  return round;
}

// -------- Submissions --------

export function useSubmissions(roundId: string | undefined) {
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(() => {
    if (!roundId) { setSubs([]); return; }
    let active = true;

    async function load() {
      const { data } = await supabase.from("submissions").select("*").eq("round_id", roundId!);
      if (!active) return;
      setSubs((data ?? []) as Submission[]);
    }
    void load();

    const channel = supabase
      .channel(`subs-${roundId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `round_id=eq.${roundId}` }, () => {
        void load();
      })
      .subscribe();

    return () => { active = false; void supabase.removeChannel(channel); };
  }, [roundId]);

  return subs;
}

// -------- Votes --------

export function useVotes(roomId: string | undefined) {
  const [votes, setVotes] = useState<PlayerVote[]>([]);

  useEffect(() => {
    if (!roomId) { setVotes([]); return; }
    let active = true;
    async function load() {
      const { data } = await supabase.from("player_votes").select("*").eq("room_id", roomId!);
      if (!active) return;
      setVotes((data ?? []) as PlayerVote[]);
    }
    void load();
    const ch = supabase
      .channel(`votes-${roomId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_votes", filter: `room_id=eq.${roomId}` }, () => {
        void load();
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(ch); };
  }, [roomId]);

  return votes;
}

// -------- Game votes (lobby suggestions) --------

export type GameVote = {
  id: string;
  room_id: string;
  player_id: string;
  game_type: string;
  created_at: string;
};

export function useGameVotes(roomId: string | undefined) {
  const [votes, setVotes] = useState<GameVote[]>([]);
  useEffect(() => {
    if (!roomId) { setVotes([]); return; }
    let active = true;
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("game_votes" as any).select("*").eq("room_id", roomId!) as any);
      if (!active) return;
      setVotes((data ?? []) as GameVote[]);
    }
    void load();
    const poll = setInterval(() => void load(), 2000);
    const ch = supabase
      .channel(`gvotes-${roomId}-${crypto.randomUUID()}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "game_votes", filter: `room_id=eq.${roomId}` }, () => { void load(); })
      .subscribe();
    return () => { active = false; clearInterval(poll); void supabase.removeChannel(ch); };
  }, [roomId]);
  return votes;
}

export async function toggleGameVote(roomId: string, playerId: string, gameType: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = supabase.from("game_votes" as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (table.select("id").eq("room_id", roomId).eq("player_id", playerId).eq("game_type", gameType).maybeSingle() as any);
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("game_votes" as any).delete().eq("id", (existing as any).id) as any);
    return "removed" as const;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("game_votes" as any).insert({ room_id: roomId, player_id: playerId, game_type: gameType }) as any);
  return "added" as const;
}

// -------- Countdown --------

let serverClockOffsetMs: number | null = null;
let serverClockOffsetFetchedAt = 0;
let serverClockOffsetPromise: Promise<number> | null = null;

const SERVER_CLOCK_MAX_AGE_MS = 30_000;

async function fetchServerClockOffset() {
  const clientBefore = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_server_time");
  const clientAfter = Date.now();
  if (error || !data) throw error ?? new Error("Server time unavailable");

  const serverMs = new Date(String(data)).getTime();
  if (!Number.isFinite(serverMs)) throw new Error("Invalid server time");

  return serverMs - ((clientBefore + clientAfter) / 2);
}

export async function syncServerClockOffset(force = false) {
  const cachedOffset = serverClockOffsetMs;
  const fresh =
    cachedOffset !== null &&
    Date.now() - serverClockOffsetFetchedAt < SERVER_CLOCK_MAX_AGE_MS;
  if (!force && fresh) return cachedOffset;

  if (!serverClockOffsetPromise) {
    serverClockOffsetPromise = fetchServerClockOffset()
      .then((offset) => {
        serverClockOffsetMs = offset;
        serverClockOffsetFetchedAt = Date.now();
        return offset;
      })
      .finally(() => {
        serverClockOffsetPromise = null;
      });
  }

  return serverClockOffsetPromise;
}

export async function getSyncedServerNowMs(force = false) {
  const offset = await syncServerClockOffset(force);
  return Date.now() + offset;
}

export function getEstimatedSyncedServerNowMs() {
  return Date.now() + (serverClockOffsetMs ?? 0);
}

export function useSyncedServerNowMs(intervalMs = 100) {
  const [now, setNow] = useState(() => getEstimatedSyncedServerNowMs());

  useEffect(() => {
    let active = true;
    const tick = () => setNow(getEstimatedSyncedServerNowMs());
    const sync = () => {
      void syncServerClockOffset()
        .then(() => { if (active) tick(); })
        .catch(() => { /* keep local estimate until backend time is available */ });
    };

    tick();
    sync();
    const tickInt = setInterval(tick, intervalMs);
    const syncInt = setInterval(sync, 15_000);
    return () => {
      active = false;
      clearInterval(tickInt);
      clearInterval(syncInt);
    };
  }, [intervalMs]);

  return now;
}

function estimateRemainingSeconds(
  endsAt: string | null | undefined,
  startedAt: string | null | undefined,
  offset: number | null,
) {
  if (!endsAt) return 0;

  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return 0;

  const start = startedAt ? new Date(startedAt).getTime() : Number.NaN;
  const hasStart = Number.isFinite(start);

  if (offset === null) {
    const roughRemaining = hasStart ? end - start : end - Date.now();
    return Math.max(1, Math.ceil(roughRemaining / 1000));
  }

  const serverNow = Date.now() + offset;
  const effectiveNow = hasStart ? Math.max(serverNow, start) : serverNow;
  return Math.max(0, Math.ceil((end - effectiveNow) / 1000));
}

/**
 * Countdown resilient to client/server clock skew.
 *
 * Reads the backend clock once, caches the offset, and then counts against
 * `ends_at` with that shared clock. While the offset is loading, it never
 * returns 0 for an active round, so clients don't auto-submit before sync.
 */
export function useCountdown(
  endsAt: string | null | undefined,
  startedAt?: string | null | undefined,
) {
  const [offset, setOffset] = useState<number | null>(serverClockOffsetMs);
  const [remaining, setRemaining] = useState<number>(() =>
    estimateRemainingSeconds(endsAt, startedAt, serverClockOffsetMs),
  );

  useEffect(() => {
    if (!endsAt) return;
    let active = true;

    const sync = () => {
      void syncServerClockOffset()
        .then((nextOffset) => {
          if (active) setOffset(nextOffset);
        })
        .catch(() => {
          // Keep the safe local estimate and retry on the next interval.
        });
    };

    sync();
    const int = setInterval(sync, 15_000);
    return () => { active = false; clearInterval(int); };
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) { setRemaining(0); return; }
    const tick = () => {
      setRemaining(estimateRemainingSeconds(endsAt, startedAt, offset));
    };
    tick();
    const int = setInterval(tick, 200);
    return () => clearInterval(int);
  }, [endsAt, startedAt, offset]);

  return remaining;
}

// -------- Heartbeat (each client keeps its own player row fresh) --------

export function useHeartbeat(playerId: string | undefined) {
  useEffect(() => {
    if (!playerId) return;

    let stopped = false;
    async function beat() {
      if (stopped) return;
      await supabase
        .from("players")
        .update({ last_seen_at: new Date().toISOString(), is_connected: true })
        .eq("id", playerId!);
    }
    void beat();
    const int = setInterval(() => void beat(), 4000);

    // On tab hide/close, soft-disconnect so others see it right away.
    const handleLeave = () => {
      void supabase
        .from("players")
        .update({ is_connected: false })
        .eq("id", playerId);
    };
    window.addEventListener("beforeunload", handleLeave);
    window.addEventListener("pagehide", handleLeave);

    return () => {
      stopped = true;
      clearInterval(int);
      window.removeEventListener("beforeunload", handleLeave);
      window.removeEventListener("pagehide", handleLeave);
    };
  }, [playerId]);
}

/**
 * Presence sweep — HOST ONLY runs this every 3s:
 * - Marks players stale (>timeout) as is_connected=false.
 * - If the current host is stale beyond 2×timeout, promote oldest connected non-kicked player.
 */
export function usePresenceSweep(room: Room | null, players: Player[], isHost: boolean) {
  const running = useRef(false);
  useEffect(() => {
    if (!room || !isHost) return;
    const int = setInterval(async () => {
      if (running.current) return;
      running.current = true;
      try {
        const timeoutMs = room.disconnect_timeout_sec * 1000;
        const now = await getSyncedServerNowMs();
        const staleIds: string[] = [];
        for (const p of players) {
          if (p.kicked || p.left_at) continue;
          if (isBot(p)) continue; // bots never go stale
          const seen = new Date(p.last_seen_at).getTime();
          const stale = now - seen > timeoutMs;
          if (stale && p.is_connected) staleIds.push(p.id);
        }
        if (staleIds.length > 0) {
          await supabase.from("players").update({ is_connected: false }).in("id", staleIds);
        }

        // Host migration if the current host is stale beyond 2×timeout
        const hostPlayer = players.find((p) => p.client_id === room.host_client_id);
        const hostStale =
          hostPlayer &&
          !hostPlayer.kicked &&
          now - new Date(hostPlayer.last_seen_at).getTime() > timeoutMs * 2;

        if (hostStale) {
          const candidates = players
            .filter((p) => !p.kicked && !p.left_at && p.id !== hostPlayer!.id)
            .filter((p) => now - new Date(p.last_seen_at).getTime() <= timeoutMs)
            .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
          const newHost = candidates[0];
          if (newHost) {
            await supabase.from("players").update({ is_host: false }).eq("id", hostPlayer!.id);
            await supabase.from("players").update({ is_host: true }).eq("id", newHost.id);
            await supabase.from("rooms").update({ host_client_id: newHost.client_id }).eq("id", room.id);
          }
        }
      } finally {
        running.current = false;
      }
    }, 3000);
    return () => clearInterval(int);
  }, [room, players, isHost]);
}

// -------- Votekick helpers --------

/** Live-count of votes per target within this room. */
export function useVoteTally(votes: PlayerVote[]) {
  return useMemo(() => {
    const map = new Map<string, string[]>(); // targetId -> voter ids
    for (const v of votes) {
      const arr = map.get(v.target_id) ?? [];
      arr.push(v.voter_id);
      map.set(v.target_id, arr);
    }
    return map;
  }, [votes]);
}

export function votesRequired(activeCount: number, thresholdPct: number): number {
  const active = Math.max(1, activeCount);
  // Simple majority default: 50%. Ceil so 3 players → 2.
  return Math.max(2, Math.ceil((active * thresholdPct) / 100));
}

/**
 * Toggle my vote for a target. Insert if missing, delete otherwise.
 * If total votes meet threshold, mark target as kicked and remove their outstanding votes.
 */
export function useKickActions(room: Room | null, players: Player[], me: Player | null) {
  const active = useMemo(() => activePlayers(players), [players]);
  const threshold = room?.settings?.votekickThresholdPct ?? 60;

  const castVote = useCallback(
    async (targetId: string) => {
      if (!room || !me) return;
      if (targetId === me.id) return;
      // Check if I already voted this target
      const { data: existing } = await supabase
        .from("player_votes")
        .select("id")
        .eq("room_id", room.id)
        .eq("voter_id", me.id)
        .eq("target_id", targetId)
        .maybeSingle();

      if (existing) {
        await supabase.from("player_votes").delete().eq("id", existing.id);
        return;
      }

      const { error } = await supabase.from("player_votes").insert({
        room_id: room.id,
        voter_id: me.id,
        target_id: targetId,
      });
      if (error) return;

      // Re-count after insert
      const { data: fresh } = await supabase
        .from("player_votes")
        .select("*")
        .eq("room_id", room.id)
        .eq("target_id", targetId);
      const total = (fresh ?? []).length;
      // Exclude the target themselves from the active-count denominator
      const activeExcludingTarget = active.filter((p) => p.id !== targetId).length;
      const need = votesRequired(activeExcludingTarget, threshold);
      if (total >= need) {
        // Kick: mark player and delete their pending votes
        await supabase
          .from("players")
          .update({ kicked: true, is_connected: false, left_at: new Date().toISOString() })
          .eq("id", targetId);
        await supabase.from("player_votes").delete().eq("room_id", room.id).eq("target_id", targetId);
      }
    },
    [room, me, active, threshold],
  );

  return { castVote, threshold };
}
