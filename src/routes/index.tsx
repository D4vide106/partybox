import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Dice5,
  Dices,
  KeyRound,
  LogIn,
  LockKeyhole,
  Users2,
  Sparkles,
  UserCircle2,
  Zap,
  Gamepad2,
  Bot,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getClientId,
  getSavedNickname,
  saveNickname,
  getSavedAvatar,
  saveAvatar,
  AVATAR_CATEGORIES,
  randomNickname,
} from "@/lib/party/client-id";
import { generateRoomCode, GAME_META, type GameType } from "@/lib/party/games";
import { GAME_ICONS } from "@/lib/party/game-icons";
import { AudioSettings } from "@/components/party/AudioSettings";
import { sfx } from "@/lib/party/audio";
import { AvatarMark } from "@/components/party/AvatarMark";

export const Route = createFileRoute("/")({
  component: Home,
});

const BOT_NAMES = ["TurboBot", "PixelAI", "CyberNano", "Vortex"];
const BOT_EMOJIS = ["🤖", "👾", "🦊", "⚡"];

function Home() {
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("capital");
  const [avatarTab, setAvatarTab] = useState(0);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNickname(getSavedNickname());
    setAvatar(getSavedAvatar());
    const params = new URLSearchParams(window.location.search);
    const j = params.get("join");
    if (j && /^\d{4}$/.test(j)) setJoinCode(j);
    setHydrated(true);
  }, []);

  async function createRoom(options?: { soloBots?: boolean; singleGame?: GameType }) {
    const nick = nickname.trim();
    if (!nick) {
      toast.error("Scegli un nickname prima di iniziare");
      return;
    }
    setBusy(true);
    sfx.click();
    saveNickname(nick);
    saveAvatar(avatar);
    const clientId = getClientId();

    let code = "";
    for (let i = 0; i < 8; i++) {
      const c = generateRoomCode();
      const { data } = await supabase.from("rooms").select("id").eq("code", c).maybeSingle();
      if (!data) {
        code = c;
        break;
      }
    }
    if (!code) {
      toast.error("Non riesco a creare una stanza, riprova");
      setBusy(false);
      return;
    }

    const defaultSeq = options?.singleGame
      ? [options.singleGame]
      : ["tapblitz", "mathblitz", "reaction", "flagguess", "priceguess", "whackmole"];

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        code,
        host_client_id: clientId,
        status: "lobby",
        current_round: 0,
        game_sequence: defaultSeq,
        settings: {
          minPlayersToStart: 1,
          autoAdvance: false,
          chatEnabled: true,
          difficulty: "normal",
        },
      })
      .select()
      .single();

    if (error || !room) {
      toast.error("Errore nella creazione stanza");
      setBusy(false);
      return;
    }

    // Add Host
    const { error: pErr } = await supabase.from("players").insert({
      room_id: room.id,
      client_id: clientId,
      nickname: nick,
      avatar_emoji: avatar,
      is_host: true,
      is_connected: true,
    });
    if (pErr) {
      toast.error("Errore ingresso stanza");
      setBusy(false);
      return;
    }

    // If Solo Mode with Bots: add 3 AI bots automatically
    if (options?.soloBots) {
      for (let i = 0; i < 3; i++) {
        await supabase.from("players").insert({
          room_id: room.id,
          client_id: `bot:${i + 1}-${Date.now()}`,
          nickname: BOT_NAMES[i] || `Bot ${i + 1}`,
          avatar_emoji: BOT_EMOJIS[i] || "🤖",
          is_host: false,
          is_connected: true,
        });
      }
    }

    sfx.start();
    void navigate({ to: "/room/$code", params: { code } });
  }

  async function joinRoom() {
    const nick = nickname.trim();
    const code = joinCode.trim();
    if (!nick) {
      toast.error("Scegli un nickname prima di entrare");
      return;
    }
    if (!/^\d{4}$/.test(code)) {
      toast.error("Il codice deve essere di 4 cifre");
      return;
    }
    setBusy(true);
    sfx.click();
    saveNickname(nick);
    saveAvatar(avatar);
    const clientId = getClientId();

    const { data: room } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
    if (!room) {
      toast.error("Nessuna stanza con questo codice");
      setBusy(false);
      return;
    }
    if (room.status === "finished") {
      toast.error("Questa partita è già finita");
      setBusy(false);
      return;
    }

    const { data: existing } = await supabase
      .from("players")
      .select("id, kicked")
      .eq("room_id", room.id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (existing?.kicked) {
      toast.error("Sei stato espulso da questa stanza");
      setBusy(false);
      return;
    }

    if (!existing) {
      const { error } = await supabase.from("players").insert({
        room_id: room.id,
        client_id: clientId,
        nickname: nick,
        avatar_emoji: avatar,
        is_host: false,
        is_connected: true,
      });
      if (error) {
        toast.error("Errore ingresso stanza");
        setBusy(false);
        return;
      }
    } else {
      await supabase
        .from("players")
        .update({
          nickname: nick,
          avatar_emoji: avatar,
          is_connected: true,
          last_seen_at: new Date().toISOString(),
          left_at: null,
        })
        .eq("id", existing.id);
    }

    sfx.join();
    void navigate({ to: "/room/$code", params: { code } });
  }

  function rollNickname() {
    const n = randomNickname();
    setNickname(n);
    sfx.click();
  }

  const gameKeys = useMemo(() => Object.keys(GAME_META) as GameType[], []);
  const currentCategory = AVATAR_CATEGORIES[avatarTab];

  return (
    <main className="relative min-h-dvh overflow-hidden px-4 py-6 sm:py-10">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[520px] w-[520px] rounded-full bg-primary/25 blur-3xl animate-pulse-glow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[520px] w-[520px] rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-6xl">
        {/* Top bar */}
        <div className="mb-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <Dices className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">PartyBox</span>
            <span className="ml-2 hidden items-center gap-1 rounded-full border border-border/70 bg-card/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:inline-flex">
              <Sparkles className="h-3 w-3 text-accent" /> v2 · Web Ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:inline-flex">
              <LockKeyhole className="h-3.5 w-3.5" /> P2P & Online
            </span>
            <AudioSettings />
          </div>
        </div>

        {/* Hero */}
        <header className="animate-rise mx-auto mb-10 max-w-2xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Realtime · Single Player & Multiplayer · 45+ Giochi
          </div>
          <Dices className="mx-auto mb-4 h-16 w-16 text-primary animate-float drop-shadow-[0_18px_35px_rgba(139,92,246,0.45)]" />
          <h1 className="font-display text-6xl font-black leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
            <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              PARTY
            </span>
            <span className="bg-gradient-to-br from-primary via-fuchsia-400 to-accent bg-clip-text text-transparent animate-gradient">
              BOX
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base font-medium text-muted-foreground sm:text-lg">
            Gioca da solo con Bot AI o apri una stanza per sfidare gli amici direttamente dal browser.
          </p>
        </header>

        {/* Content grid */}
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
          {/* Player card & actions */}
          <section className="glass-card animate-rise rounded-3xl p-5 sm:p-6" style={{ animationDelay: "80ms" }}>
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              <UserCircle2 className="h-4 w-4 text-primary" /> Il tuo profilo
            </div>

            <label htmlFor="nickname" className="mb-2 block text-xs font-bold text-muted-foreground">
              Nickname
            </label>
            <div className="mb-5 flex gap-2">
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 16))}
                placeholder="Es. NightOwl"
                maxLength={16}
                className="min-w-0 flex-1 rounded-xl border border-border bg-input/70 px-4 py-3 text-base font-semibold outline-none transition focus:border-primary focus:bg-input focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={rollNickname}
                className="grid min-h-11 w-12 shrink-0 place-items-center rounded-xl border border-border bg-secondary/60 text-foreground transition hover:bg-secondary hover:scale-105 active:scale-95"
                aria-label="Nickname casuale"
                title="Casuale"
              >
                <Dice5 className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground">Avatar</label>
              {hydrated && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-2 py-1">
                  <AvatarMark value={avatar} size="sm" />
                  <span className="text-[11px] font-bold text-muted-foreground">selezionato</span>
                </div>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Categorie avatar"
              className="mb-2 flex gap-1 overflow-x-auto rounded-xl bg-secondary/30 p-1"
            >
              {AVATAR_CATEGORIES.map((c, i) => (
                <button
                  key={c.label}
                  type="button"
                  role="tab"
                  aria-selected={avatarTab === i}
                  onClick={() => {
                    setAvatarTab(i);
                    sfx.click();
                  }}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black transition ${
                    avatarTab === i
                      ? "bg-primary text-primary-foreground shadow-neon"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-4 gap-2 rounded-xl bg-secondary/20 p-2">
              {currentCategory.avatars.map((a) => {
                const selected = hydrated && avatar === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAvatar(a.id);
                      sfx.click();
                    }}
                    className={`group grid aspect-square place-items-center rounded-xl transition-all duration-200 ${
                      selected
                        ? "bg-primary shadow-neon scale-[1.08] ring-2 ring-accent"
                        : "bg-card/40 hover:bg-secondary hover:scale-105"
                    }`}
                    aria-label={`Avatar ${a.label}`}
                    aria-pressed={selected}
                  >
                    <AvatarMark value={a.id} size="md" />
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {/* Solo vs Bots */}
              <button
                type="button"
                onClick={() => void createRoom({ soloBots: true })}
                disabled={busy}
                className="btn-shine group flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent via-amber-400 to-yellow-500 px-6 py-4 text-lg font-black text-accent-foreground shadow-neon-yellow transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Bot className="h-5 w-5" />
                Gioca da Solo (vs Bot AI)
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Multiplayer Room */}
              <button
                type="button"
                onClick={() => void createRoom({ soloBots: false })}
                disabled={busy}
                className="btn-shine group flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-fuchsia-500 to-accent px-6 py-4 text-base font-black text-primary-foreground shadow-neon transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Users2 className="h-5 w-5" />
                Crea Stanza Multiplayer
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> oppure <div className="h-px flex-1 bg-border" />
            </div>

            {/* Join with code */}
            <label htmlFor="join-code" className="mb-2 block text-xs font-bold text-muted-foreground">
              Entra con codice
            </label>
            <div className="flex gap-2">
              <input
                id="join-code"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                aria-label="Codice stanza a 4 cifre"
                className="min-w-0 flex-1 rounded-xl border border-border bg-input/70 px-4 py-4 text-center font-mono text-2xl font-black tracking-[0.42em] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
              />
              <button
                type="button"
                onClick={joinRoom}
                disabled={busy || joinCode.length !== 4}
                className="btn-shine inline-flex min-h-14 items-center gap-2 rounded-xl bg-accent px-5 text-base font-black text-accent-foreground shadow-neon-yellow transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LogIn className="h-4 w-4" /> Entra
              </button>
            </div>

            <p className="mt-6 inline-flex w-full items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-accent" /> 1–8 giocatori · zero download · 100% nel browser
            </p>
          </section>

          {/* Games grid / Quick Practice */}
          <section className="animate-rise" style={{ animationDelay: "160ms" }}>
            <div className="glass-card rounded-3xl p-5 sm:p-6">
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
                    <Gamepad2 className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="truncate font-display text-lg font-black sm:text-xl">Catalogo Minigiochi</h2>
                    <p className="text-[11px] text-muted-foreground">Clicca su un gioco per avviare una sessione rapida</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {gameKeys.length} mini-games
                </span>
              </div>

              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 max-h-[560px] overflow-y-auto pr-1">
                {gameKeys.map((k, i) => {
                  const g = GAME_META[k];
                  const Icon = GAME_ICONS[k];
                  return (
                    <li key={k} className="animate-rise" style={{ animationDelay: `${200 + i * 20}ms` }}>
                      <button
                        type="button"
                        onClick={() => void createRoom({ singleGame: k, soloBots: true })}
                        disabled={busy}
                        className={`group relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${g.color} p-3.5 text-center shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-neon cursor-pointer text-left`}
                      >
                        <div
                          aria-hidden
                          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                        />
                        <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
                          <Icon className="h-5 w-5 text-primary-foreground" aria-hidden />
                        </div>
                        <div className="text-xs font-black text-primary-foreground sm:text-sm text-center">
                          {g.name}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-primary-foreground/85 text-center">
                          {g.tagline}
                        </div>
                        <div className="mt-2 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider group-hover:bg-accent group-hover:text-accent-foreground transition">
                            <Play className="h-2.5 w-2.5" /> Gioca
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                <FeatureChip icon={Bot} label="Single Player AI" desc="Allenati contro i Bot" />
                <FeatureChip icon={Users2} label="Multiplayer Lobby" desc="Sfida fino a 8 amici" />
                <FeatureChip icon={Sparkles} label="GitHub Pages Ready" desc="100% statico e veloce" />
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-10 text-center text-[11px] font-semibold text-muted-foreground/70">
          PartyBox · Gioca ovunque senza installare nulla · © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}

function FeatureChip({ icon: Icon, label, desc }: { icon: typeof KeyRound; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-black">{label}</div>
        <div className="truncate text-[10px] text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}
