import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Player, Room } from "@/lib/party/hooks";
import { sfx } from "@/lib/party/audio";

/**
 * Persistent "Leave room" control.
 * - Marks the player as left_at + disconnected.
 * - If they were host, promotes the first other active player.
 * - Navigates home.
 */
export function LeaveButton({
  room, me, players, compact = false,
}: {
  room: Room;
  me: Player | null;
  players: Player[];
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmLeave() {
    if (!me) { void navigate({ to: "/" }); return; }
    setBusy(true);
    sfx.click();

    const iAmHost = me.is_host || room.host_client_id === me.client_id;

    // Find a human (non-bot) successor if I'm leaving
    const humanSuccessor = players
      .filter((p) => p.id !== me.id && !p.kicked && !p.left_at && !p.client_id.startsWith("bot:"))
      .sort((a, b) => {
        if (a.is_connected !== b.is_connected) return a.is_connected ? -1 : 1;
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
      })[0];

    if (iAmHost && !humanSuccessor) {
      // No humans left — close the room entirely to avoid orphan/bot-only rooms
      await supabase.from("chat_messages").delete().eq("room_id", room.id);
      await supabase.from("game_votes").delete().eq("room_id", room.id);
      await supabase.from("player_votes").delete().eq("room_id", room.id);
      await supabase.from("monopoly_games").delete().eq("room_id", room.id);
      await supabase.from("submissions").delete().in(
        "round_id",
        (await supabase.from("rounds").select("id").eq("room_id", room.id)).data?.map((r) => r.id) ?? [],
      );
      await supabase.from("rounds").delete().eq("room_id", room.id);
      await supabase.from("players").delete().eq("room_id", room.id);
      await supabase.from("rooms").delete().eq("id", room.id);
      void navigate({ to: "/" });
      return;
    }

    if (iAmHost && humanSuccessor) {
      await supabase.from("players").update({ is_host: false }).eq("room_id", room.id);
      await supabase.from("players").update({ is_host: true }).eq("id", humanSuccessor.id);
      await supabase.from("rooms").update({ host_client_id: humanSuccessor.client_id }).eq("id", room.id);
    }

    await supabase
      .from("players")
      .update({
        is_host: false,
        is_connected: false,
        left_at: new Date().toISOString(),
      })
      .eq("id", me.id);

    void navigate({ to: "/" });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); sfx.click(); }}
        aria-label="Esci dalla stanza"
        className={
          compact
            ? "inline-flex items-center justify-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 text-destructive px-2.5 py-1.5 text-xs font-black hover:bg-destructive/20 transition"
            : "inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 text-destructive px-3.5 py-2 text-sm font-black hover:bg-destructive/20 transition"
        }
      >
        <LogOut className={compact ? "h-3 w-3" : "h-4 w-4"} />
        {compact ? "" : "Esci"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-sm animate-in fade-in p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-black flex items-center gap-2"><LogOut className="h-5 w-5 text-destructive" /> Uscire dalla stanza?</h3>
              <button type="button" aria-label="Chiudi" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Verrai riportato al menu principale. Puoi rientrare con lo stesso codice se la partita è ancora aperta.
              {(me?.is_host || room.host_client_id === me?.client_id) && (
                <> Il ruolo di <b className="text-accent">host</b> passerà a un altro giocatore.</>
              )}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-secondary transition"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmLeave}
                disabled={busy}
                className="flex-1 rounded-2xl bg-destructive text-destructive-foreground px-4 py-3 text-sm font-black hover:opacity-90 transition disabled:opacity-40"
              >
                {busy ? "Uscendo…" : "Esci"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
