import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Copy, QrCode, Play, Users, Crown, Bot, Check, ChevronDown, Coins, PlayCircle, Landmark, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Room, Player, PlayerVote, RoomSettings } from "@/lib/party/hooks";
import { useGameVotes, toggleGameVote } from "@/lib/party/hooks";
import { GAME_META, type GameType } from "@/lib/party/games";
import { GAME_ICONS } from "@/lib/party/game-icons";
import { GAME_CATEGORIES, buildSequence, type GameCategoryId } from "@/lib/party/categories";
import { HostSettings } from "./HostSettings";
import { MembersPanel } from "./MembersPanel";
import { AudioSettings } from "./AudioSettings";
import { ChatPanel } from "./ChatPanel";
import { LeaveButton } from "./LeaveButton";
import { sfx } from "@/lib/party/audio";

export function Lobby({
  room, players, me, isHost, votes, onStart,
}: {
  room: Room;
  players: Player[];
  me: Player | null;
  isHost: boolean;
  votes: PlayerVote[];
  onStart: () => void;
}) {
  const [showQR, setShowQR] = useState(false);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/?join=${room.code}` : "";

  // Optimistic game selection — reflect immediately, persist debounced/serialized
  const [localSeq, setLocalSeq] = useState<string[]>(room.game_sequence);
  const pendingRef = useRef(0);
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    // Only sync from server when we have no in-flight local mutations,
    // otherwise fast successive clicks get clobbered by stale realtime pushes.
    if (pendingRef.current === 0) setLocalSeq(room.game_sequence);
  }, [room.game_sequence]);

  async function copyCode() {
    try { await navigator.clipboard.writeText(room.code); toast.success("Codice copiato!"); sfx.click(); } catch { /* ignore */ }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(joinUrl); toast.success("Link copiato!"); sfx.click(); } catch { /* ignore */ }
  }

  function persistSeq(seq: string[], prev: string[]) {
    pendingRef.current += 1;
    chainRef.current = chainRef.current
      .then(() => supabase.from("rooms").update({ game_sequence: seq }).eq("id", room.id))
      .then((res) => {
        const err = (res as { error?: { message?: string } } | undefined)?.error;
        if (err) {
          setLocalSeq(prev);
          toast.error("Errore aggiornamento");
        }
      })
      .catch(() => {
        setLocalSeq(prev);
        toast.error("Errore aggiornamento");
      })
      .finally(() => {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
      });
  }

  function persistSettings(patch: Partial<RoomSettings>) {
    const next: RoomSettings = { ...(room.settings ?? {}), ...patch };
    chainRef.current = chainRef.current
      .then(() => supabase.from("rooms").update({ settings: next }).eq("id", room.id))
      .then((res) => {
        const err = (res as { error?: { message?: string } } | undefined)?.error;
        if (err) toast.error("Errore salvataggio impostazioni");
      })
      .catch(() => toast.error("Errore salvataggio impostazioni"));
  }


  function toggleGame(g: GameType) {
    if (!isHost) return;
    sfx.click();
    setLocalSeq((cur) => {
      const seq = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
      if (seq.length === 0) { toast.error("Serve almeno un mini-gioco"); return cur; }
      persistSeq(seq, cur);
      return seq;
    });
  }

  // Instant local mirror of selected category (avoids waiting for realtime).
  const [localCat, setLocalCat] = useState<GameCategoryId | undefined>(
    (room.settings?.gameCategory as GameCategoryId | undefined) ?? undefined,
  );
  const catPendingRef = useRef(0);
  useEffect(() => {
    if (catPendingRef.current === 0) {
      setLocalCat((room.settings?.gameCategory as GameCategoryId | undefined) ?? undefined);
    }
  }, [room.settings?.gameCategory]);

  function selectCategory(id: GameCategoryId) {
    if (!isHost) return;
    sfx.click();
    const seq = buildSequence(id);
    if (seq.length === 0) return;
    const prev = localSeq;
    const prevCat = localCat;
    // Instant UI: mirror both seq and category client-side.
    setLocalSeq(seq);
    setLocalCat(id);
    pendingRef.current += 1;
    catPendingRef.current += 1;
    chainRef.current = chainRef.current
      .then(() => supabase
        .from("rooms")
        .update({
          game_sequence: seq,
          settings: { ...(room.settings ?? {}), gameCategory: id } as RoomSettings,
        })
        .eq("id", room.id))
      .then((res) => {
        const err = (res as { error?: { message?: string } } | undefined)?.error;
        if (err) {
          setLocalSeq(prev);
          setLocalCat(prevCat);
          toast.error("Errore aggiornamento categoria");
        } else if (prevCat !== id) {
          const cat = GAME_CATEGORIES.find((c) => c.id === id);
          if (cat) toast.success(`Categoria: ${cat.name}`);
        }
      })
      .catch(() => {
        setLocalSeq(prev);
        setLocalCat(prevCat);
        toast.error("Errore aggiornamento categoria");
      })
      .finally(() => {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        catPendingRef.current = Math.max(0, catPendingRef.current - 1);
      });
  }

  const activeCount = players.filter((p) => !p.kicked && p.is_connected).length;
  const minPlayers = room.settings?.minPlayersToStart ?? 1;
  const canStart = activeCount >= minPlayers && isHost && localSeq.length > 0;
  const selectedCategoryId = localCat;
  const [expandedCat, setExpandedCat] = useState<GameCategoryId | null>(null);

  // -------- Category votes (reuse game_votes table with "cat:<id>" keys) --------
  const CAT_KEY = (id: GameCategoryId) => `cat:${id}`;
  const allVotes = useGameVotes(room.id);
  const [catVoteOverride, setCatVoteOverride] = useState<Record<string, "on" | "off">>({});
  // Drop overrides that already match server truth
  useEffect(() => {
    if (!me) return;
    setCatVoteOverride((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(prev)) {
        const serverHas = allVotes.some((v) => v.player_id === me.id && v.game_type === key);
        if ((prev[key] === "on" && serverHas) || (prev[key] === "off" && !serverHas)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [allVotes, me]);

  const catVoteCounts = useMemo(() => {
    const m = new Map<GameCategoryId, number>();
    for (const v of allVotes) {
      if (!v.game_type.startsWith("cat:")) continue;
      const id = v.game_type.slice(4) as GameCategoryId;
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    if (me) {
      for (const [key, state] of Object.entries(catVoteOverride)) {
        if (!key.startsWith("cat:")) continue;
        const id = key.slice(4) as GameCategoryId;
        const serverHas = allVotes.some((v) => v.player_id === me.id && v.game_type === key);
        if (state === "on" && !serverHas) m.set(id, (m.get(id) ?? 0) + 1);
        if (state === "off" && serverHas) m.set(id, Math.max(0, (m.get(id) ?? 0) - 1));
      }
    }
    return m;
  }, [allVotes, me, catVoteOverride]);

  const myCatVotes = useMemo(() => {
    const s = new Set<GameCategoryId>();
    if (!me) return s;
    for (const v of allVotes) {
      if (v.player_id === me.id && v.game_type.startsWith("cat:")) {
        s.add(v.game_type.slice(4) as GameCategoryId);
      }
    }
    for (const [key, state] of Object.entries(catVoteOverride)) {
      if (!key.startsWith("cat:")) continue;
      const id = key.slice(4) as GameCategoryId;
      if (state === "on") s.add(id);
      else s.delete(id);
    }
    return s;
  }, [allVotes, me, catVoteOverride]);

  async function toggleCategoryVote(id: GameCategoryId) {
    if (!me || isHost) return;
    sfx.click();
    const key = CAT_KEY(id);
    const currentlyVoted = myCatVotes.has(id);
    // Optimistic instant flip
    setCatVoteOverride((prev) => ({ ...prev, [key]: currentlyVoted ? "off" : "on" }));
    try {
      await toggleGameVote(room.id, me.id, key);
    } catch {
      setCatVoteOverride((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.error("Errore voto");
    }
  }

  function onCategoryClick(id: GameCategoryId) {
    if (isHost) selectCategory(id);
    else void toggleCategoryVote(id);
  }

  function toggleGameInSeq(g: GameType) {
    if (!isHost) return;
    sfx.click();
    setLocalSeq((cur) => {
      const seq = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
      if (seq.length === 0) { toast.error("Serve almeno un mini-gioco"); return cur; }
      persistSeq(seq, cur);
      return seq;
    });
  }



  const BOT_EMOJIS = ["🤖", "👾", "🐙", "🐸", "🦊", "🐵", "🐼", "🦄", "🐲", "👻"];
  const BOT_NAMES = ["Botolo", "Zap", "Pixel", "Turbo", "Glitch", "Nano", "Echo", "Kilo", "Nebula", "Vortex"];

  async function addBot() {
    if (!isHost) return;
    sfx.click();
    const rand = Math.floor(Math.random() * 1_000_000);
    const emoji = BOT_EMOJIS[Math.floor(Math.random() * BOT_EMOJIS.length)];
    const baseName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const existing = new Set(players.map((p) => p.nickname));
    let nickname = baseName;
    let n = 2;
    while (existing.has(nickname)) { nickname = `${baseName} ${n++}`; }
    const { error } = await supabase.from("players").insert({
      room_id: room.id,
      client_id: `bot:${rand}-${Date.now()}`,
      nickname,
      avatar_emoji: emoji,
      is_connected: true,
      is_host: false,
    });
    if (error) toast.error("Errore aggiunta bot"); else toast.success(`Bot ${nickname} aggiunto`);
  }


  return (
    <main className="min-h-dvh px-3 sm:px-4 py-4 sm:py-6">
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <div className="text-xs uppercase tracking-widest font-black text-muted-foreground">PartyBox</div>
          <div className="flex items-center gap-2 flex-wrap">
            {isHost && <HostSettings room={room} />}
            <AudioSettings />
            <LeaveButton room={room} me={me} players={players} />
          </div>
        </div>

        {/* Code hero */}
        <section className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-1">Codice stanza</div>
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copia codice stanza"
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-[0.25em] sm:tracking-[0.3em] text-primary text-glow hover:scale-105 transition"
          >
            {room.code}
          </button>
          <div className="mt-3 flex justify-center gap-2 flex-wrap">
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold hover:bg-secondary/70 min-h-11">
              <Copy className="h-3.5 w-3.5" /> Copia link
            </button>
            <button type="button" onClick={() => { setShowQR(!showQR); sfx.click(); }} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold hover:bg-secondary/70 min-h-11">
              <QrCode className="h-3.5 w-3.5" /> {showQR ? "Nascondi QR" : "Mostra QR"}
            </button>
          </div>
          {showQR && joinUrl && (
            <div className="mt-4 inline-block p-4 bg-white rounded-2xl animate-bounce-in">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
          )}
        </section>

        {/* Grid: games | members+chat */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Games */}
          <section className="rounded-3xl border border-border bg-card/70 backdrop-blur p-4 sm:p-6" aria-label="Categorie di gioco">
            <div className="flex items-center justify-between mb-1 gap-2">
              <h2 className="font-black text-lg sm:text-xl flex items-center gap-2">
                🎮 Categoria di gioco
              </h2>
              {selectedCategoryId && (
                <span className="text-xs font-bold text-muted-foreground shrink-0">
                  {localSeq.length} round in coda
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {isHost
                ? "Scegli una categoria: penseremo noi a mescolare i mini-giochi giusti."
                : "Vota la tua categoria preferita — l'host sceglie tenendo conto dei voti."}
            </p>
            <ul className="space-y-2.5">
              {GAME_CATEGORIES.map((cat) => {
                const active = selectedCategoryId === cat.id;
                const isOpen = expandedCat === cat.id;
                const selectedInCat = cat.games.filter((g) => localSeq.includes(g)).length;
                const canExpand = isHost && (!cat.auto || cat.id === "monopoly");
                const isMonopoly = cat.id === "monopoly";
                return (
                  <li
                    key={cat.id}
                    className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                      active
                        ? `ring-2 ${cat.ring} ring-offset-2 ring-offset-background shadow-xl scale-[1.005]`
                        : "shadow-md hover:shadow-lg"
                    }`}
                  >
                    {/* Header */}
                    <div className={`relative flex items-stretch bg-gradient-to-r ${cat.gradient} text-white overflow-hidden ${active ? "" : "opacity-80 hover:opacity-100"}`}>
                      {/* Decorative giant emoji */}
                      <span
                        aria-hidden
                        className="pointer-events-none select-none absolute -right-2 -bottom-4 text-7xl opacity-15 drop-shadow-2xl leading-none rotate-[-8deg]"
                      >
                        {cat.emoji}
                      </span>
                      {/* Subtle overlay for readability */}
                      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />

                      <button
                        type="button"
                        onClick={() => onCategoryClick(cat.id)}
                        aria-pressed={isHost ? active : myCatVotes.has(cat.id)}
                        aria-label={
                          isHost
                            ? `Seleziona categoria ${cat.name}`
                            : `Vota categoria ${cat.name}`
                        }
                        className={`relative z-10 flex-1 flex items-center gap-3 px-4 py-3.5 text-left min-h-16 hover:bg-black/10 active:bg-black/20`}
                      >
                        <span
                          className={`grid place-items-center h-11 w-11 rounded-xl bg-white/15 backdrop-blur text-2xl shadow-inner shrink-0 ${
                            active ? "ring-2 ring-white/60" : ""
                          }`}
                          aria-hidden
                        >
                          {cat.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 font-black text-base tracking-tight leading-none flex-wrap">
                            <span className="drop-shadow">{cat.name}</span>
                            {active && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-1.5 py-0.5 text-[9px] uppercase tracking-widest">
                                <Check className="h-2.5 w-2.5" /> Scelta
                              </span>
                            )}
                            {!isHost && myCatVotes.has(cat.id) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/30 backdrop-blur px-1.5 py-0.5 text-[9px] uppercase tracking-widest">
                                <ThumbsUp className="h-2.5 w-2.5" /> Votata
                              </span>
                            )}
                          </span>
                          <span className="block text-[11px] opacity-90 leading-tight mt-1 truncate font-semibold">
                            {cat.tagline}
                          </span>
                        </span>
                        <span className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-widest bg-black/30 backdrop-blur rounded-full px-2.5 py-1">
                            {isMonopoly
                              ? "1 partita"
                              : cat.auto
                                ? cat.id === "random" ? "8 casuali" : "24 shuffle"
                                : `${selectedInCat}/${cat.games.length}`}
                          </span>
                          {(catVoteCounts.get(cat.id) ?? 0) > 0 && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black shadow ${
                                myCatVotes.has(cat.id)
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-black/40 text-white"
                              }`}
                              title={`${catVoteCounts.get(cat.id)} voti`}
                            >
                              <ThumbsUp className="h-3 w-3" aria-hidden /> {catVoteCounts.get(cat.id)}
                            </span>
                          )}
                        </span>
                      </button>

                      {canExpand && (
                        <button
                          type="button"
                          onClick={() => { setExpandedCat(isOpen ? null : cat.id); sfx.click(); }}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "Chiudi dettagli" : "Apri dettagli"}
                          className="relative z-10 px-3.5 flex items-center justify-center hover:bg-black/15 active:bg-black/25 border-l border-white/25"
                        >
                          <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>

                    {/* Expanded body */}
                    {canExpand && isOpen && (
                      <div className="bg-card/90 backdrop-blur border-t border-border/50 p-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {isMonopoly ? (
                          <MonopolySettings
                            settings={room.settings}
                            onSave={(patch) => persistSettings(patch)}
                          />
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                                Mini-giochi ({selectedInCat}/{cat.games.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const merged = Array.from(new Set([...localSeq, ...cat.games]));
                                  setLocalSeq(merged);
                                  persistSeq(merged, localSeq);
                                  sfx.click();
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-primary/15 text-primary px-2.5 py-1 hover:bg-primary/25 transition"
                              >
                                <Check className="h-3 w-3" /> Seleziona tutti
                              </button>
                            </div>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cat.games.map((g) => {
                                const meta = GAME_META[g];
                                const Icon = GAME_ICONS[g];
                                const on = localSeq.includes(g);
                                return (
                                  <li key={g}>
                                    <button
                                      type="button"
                                      onClick={() => toggleGameInSeq(g)}
                                      aria-pressed={on}
                                      className={`w-full flex items-start gap-2 rounded-xl p-2.5 text-left transition-all min-h-14 ${
                                        on
                                          ? `bg-gradient-to-br ${meta.color} text-white shadow-md ring-1 ring-white/20`
                                          : "bg-secondary/50 text-foreground hover:bg-secondary/80"
                                      }`}
                                    >
                                      <span
                                        className={`grid place-items-center h-8 w-8 rounded-lg shrink-0 ${
                                          on ? "bg-white/20" : "bg-background/60"
                                        }`}
                                      >
                                        <Icon className="h-4 w-4" aria-hidden />
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-1.5 font-black text-xs leading-none">
                                          <span className="truncate">{meta.name}</span>
                                          {on && <Check className="h-3 w-3 shrink-0 opacity-90" aria-hidden />}
                                        </span>
                                        <span className={`block text-[10px] leading-snug mt-1 line-clamp-2 ${on ? "opacity-90" : "text-muted-foreground"}`}>
                                          {meta.tagline}
                                        </span>
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {!selectedCategoryId && isHost && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Seleziona una categoria per iniziare.
              </p>
            )}


          </section>


          {/* Members + Chat side */}
          <aside className="space-y-4">
            <MembersPanel room={room} players={players} me={me} votes={votes} onRemoveBot={isHost ? async (id) => {
              const { error } = await supabase.from("players").update({ kicked: true, is_connected: false, left_at: new Date().toISOString() }).eq("id", id);
              if (error) toast.error("Errore rimozione bot"); else { sfx.click(); toast("Bot rimosso"); }
            } : undefined} onMakeHost={isHost ? async (clientId) => {
              const { error: e1 } = await supabase.from("rooms").update({ host_client_id: clientId }).eq("id", room.id);
              if (e1) { toast.error("Errore trasferimento host"); return; }
              await supabase.from("players").update({ is_host: false }).eq("room_id", room.id);
              await supabase.from("players").update({ is_host: true }).eq("room_id", room.id).eq("client_id", clientId);
              sfx.click();
              toast("Host trasferito");
            } : undefined} />
            {isHost && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void addBot()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 px-3 py-2.5 text-xs font-black text-primary transition min-h-11"
                  aria-label="Aggiungi 1 bot"
                >
                  <Bot className="h-4 w-4" /> +1 Bot
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await addBot();
                    await addBot();
                    await addBot();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-accent/50 bg-accent/5 hover:bg-accent/10 px-3 py-2.5 text-xs font-black text-accent transition min-h-11"
                  aria-label="Aggiungi 3 bot"
                >
                  <Bot className="h-4 w-4" /> +3 Bot (Full)
                </button>
              </div>
            )}
            <div className="rounded-3xl border border-border bg-card/70 backdrop-blur p-3 h-[380px]">
              <ChatPanel room={room} me={me} players={players} variant="sidebar" />
            </div>
            <div className="rounded-3xl border border-border/60 bg-card/40 p-4 text-xs text-muted-foreground flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span>
                {minPlayers <= 1
                  ? "Puoi iniziare subito in solitaria o giocare con amici e Bot!"
                  : `Servono almeno ${minPlayers} giocatori attivi per iniziare.`}
              </span>
            </div>
          </aside>
        </div>

        {/* Start button */}
        <div className="mt-6 sticky bottom-3 z-20">
          {isHost ? (
            <button
              type="button"
              onClick={() => { sfx.start(); onStart(); }}
              disabled={!canStart}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent text-accent-foreground text-xl sm:text-2xl font-black py-5 sm:py-6 shadow-neon-yellow animate-pulse-glow hover:scale-[1.01] active:scale-95 transition-transform disabled:opacity-40 disabled:animate-none min-h-14"
            >
              <Play className="h-6 w-6" /> INIZIA LA PARTITA
            </button>
          ) : (
            <div className="w-full rounded-2xl bg-card/50 border border-border text-center py-6 text-lg font-bold text-muted-foreground flex items-center justify-center gap-2 backdrop-blur">
              <Crown className="h-5 w-5" /> L'host può iniziare la partita
            </div>
          )}
        </div>

        {/* Chat drawer for mobile */}
        <div className="lg:hidden">
          <ChatPanel room={room} me={me} players={players} variant="drawer" />
        </div>
      </div>
    </main>
  );
}

function MonopolySettings({
  settings,
  onSave,
}: {
  settings: RoomSettings;
  onSave: (patch: Partial<RoomSettings>) => void;
}) {
  const [cash, setCash] = useState(settings?.monopolyStartCash ?? 1500);
  const [go, setGo] = useState(settings?.monopolyGoBonus ?? 200);
  const [jail, setJail] = useState(settings?.monopolyJailFee ?? 50);

  // Debounce persist so dragging the slider doesn't hammer the DB
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function schedule(patch: Partial<RoomSettings>) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(patch), 350);
  }
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="space-y-4">
      <div className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
        Impostazioni Monopoly
      </div>

      <MonoField
        icon={<Coins className="h-4 w-4 text-emerald-500" />}
        label="Cash iniziale"
        value={`$${cash}`}
        hint="Ogni giocatore parte con questa cifra"
      >
        <input
          type="range" min={500} max={3000} step={100} value={cash}
          onChange={(e) => { const v = Number(e.target.value); setCash(v); schedule({ monopolyStartCash: v }); }}
          className="w-full accent-emerald-500 h-2"
        />
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-1">
          <span>$500</span><span>$1500</span><span>$2500</span><span>$3000</span>
        </div>
      </MonoField>

      <MonoField
        icon={<PlayCircle className="h-4 w-4 text-lime-500" />}
        label="Bonus dal VIA"
        value={`+$${go}`}
        hint="Bonus per ogni giro completato"
      >
        <input
          type="range" min={0} max={500} step={50} value={go}
          onChange={(e) => { const v = Number(e.target.value); setGo(v); schedule({ monopolyGoBonus: v }); }}
          className="w-full accent-lime-500 h-2"
        />
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-1">
          <span>$0</span><span>$200</span><span>$350</span><span>$500</span>
        </div>
      </MonoField>

      <MonoField
        icon={<Landmark className="h-4 w-4 text-amber-500" />}
        label="Cauzione prigione"
        value={`$${jail}`}
        hint="Costo per uscire subito dalla prigione"
      >
        <input
          type="range" min={0} max={200} step={25} value={jail}
          onChange={(e) => { const v = Number(e.target.value); setJail(v); schedule({ monopolyJailFee: v }); }}
          className="w-full accent-amber-500 h-2"
        />
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground mt-1">
          <span>$0</span><span>$50</span><span>$100</span><span>$200</span>
        </div>
      </MonoField>

      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
        💾 Le modifiche vengono salvate automaticamente e valgono per la prossima partita.
      </div>
    </div>
  );
}

function MonoField({
  icon, label, value, hint, children,
}: {
  icon: React.ReactNode; label: string; value: string; hint: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-secondary/40 p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <div className="font-black text-sm">{label}</div>
        </div>
        <div className="font-black text-sm tabular-nums">{value}</div>
      </div>
      <div className="text-[11px] text-muted-foreground mb-2">{hint}</div>
      {children}
    </div>
  );
}

