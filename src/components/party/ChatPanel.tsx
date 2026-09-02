import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useChat, useSendChat } from "@/lib/party/chat";
import type { Player, Room } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";
import { AvatarMark } from "./AvatarMark";

export function ChatPanel({
  room, me, players, variant = "sidebar",
}: {
  room: Room;
  me: Player | null;
  players: Player[];
  variant?: "sidebar" | "drawer";
}) {
  const [openMobile, setOpenMobile] = useState(false);
  const messages = useChat(room.id);
  const send = useSendChat(room.id, me?.id, me?.nickname ?? "", me?.avatar_emoji ?? "🎉");
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const unread = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastIdRef = useRef<string | null>(null);

  const chatEnabled = room.settings?.chatEnabled !== false;

  // Auto-scroll on new message
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (near) el.scrollTop = el.scrollHeight;
    const last = messages[messages.length - 1];
    if (last && last.id !== lastIdRef.current) {
      if (last.player_id !== me?.id) {
        if (!openMobile && variant === "drawer") {
          unread.current++;
          setUnreadCount(unread.current);
        }
        sfx.click();
      }
      lastIdRef.current = last.id;
    }
  }, [messages, me?.id, openMobile, variant]);

  useEffect(() => {
    if (openMobile) { unread.current = 0; setUnreadCount(0); }
  }, [openMobile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const ok = await send(text);
    if (ok) { setText(""); sfx.click(); }
  }

  const onlineIds = useMemo(() => new Set(players.filter(p => p.is_connected && !p.kicked).map(p => p.id)), [players]);

  const content = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-1.5">
          <MessageCircle className="h-3 w-3" /> Chat
        </div>
        <div className="text-[10px] text-muted-foreground">{messages.length} msg</div>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 scroll-smooth"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-6 opacity-70">
            Nessun messaggio. Scrivi il primo!
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.player_id === me?.id;
          const isOnline = onlineIds.has(m.player_id);
          return (
            <div key={m.id} className={`flex gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className="shrink-0 pt-0.5"><AvatarMark value={m.avatar} label={m.nickname} size="sm" /></div>
              <div className={`min-w-0 max-w-[85%] ${isMe ? "text-right" : ""}`}>
                <div className="flex items-baseline gap-1 text-[10px] text-muted-foreground">
                  <span className={`truncate font-bold ${isMe ? "text-accent" : ""}`}>{m.nickname}</span>
                  {!isOnline && <span className="opacity-60">·off</span>}
                </div>
                <div className={`inline-block rounded-2xl px-2.5 py-1.5 text-sm break-words ${
                  isMe ? "bg-primary/25 rounded-tr-sm" : "bg-secondary/70 rounded-tl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {chatEnabled ? (
        <form onSubmit={submit} className="mt-2 flex gap-1.5 shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 300))}
            placeholder={me ? "Scrivi…" : "Entra per chattare"}
            disabled={!me}
            maxLength={300}
            className="flex-1 min-w-0 rounded-full bg-input border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            aria-label="Messaggio chat"
          />
          <button
            type="submit"
            disabled={!me || !text.trim()}
            className="shrink-0 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:scale-105 active:scale-95 transition"
            aria-label="Invia messaggio"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <div className="mt-2 rounded-full bg-secondary/40 text-[11px] text-center py-2 text-muted-foreground shrink-0">
          Chat disattivata dall'host
        </div>
      )}
    </div>
  );

  if (variant === "sidebar") {
    // Inline column: caller places it in a grid
    return (
      <section className="hidden lg:flex flex-col rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-3 h-full min-h-0" aria-label="Chat">
        {content}
      </section>
    );
  }

  // Drawer variant: floating button (mobile + tablet)
  return (
    <>
      <button
        type="button"
        onClick={() => { setOpenMobile(true); sfx.click(); }}
        className="lg:hidden fixed bottom-3 left-3 z-40 inline-flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2.5 text-sm font-black shadow-lg hover:scale-105 active:scale-95 transition"
        aria-label="Apri chat"
      >
        <MessageCircle className="h-4 w-4" />
        Chat
        {unreadCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-black px-1.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-background/80 backdrop-blur-md animate-in fade-in" role="dialog" aria-modal="true" aria-label="Chat">
          <div className="mt-auto h-[75dvh] rounded-t-3xl border-t border-border bg-card p-4 flex flex-col animate-in slide-in-from-bottom shadow-2xl">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <div className="text-sm font-black flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Chat</div>
              <button
                type="button"
                onClick={() => setOpenMobile(false)}
                aria-label="Chiudi chat"
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{content}</div>
          </div>
        </div>
      )}
    </>
  );
}
