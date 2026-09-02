import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  room_id: string;
  player_id: string;
  nickname: string;
  avatar: string;
  text: string;
  created_at: string;
};

const BAD_WORDS = ["cazzo","stronzo","merda","fuck","shit","bitch","porco"];
function sanitize(text: string) {
  let t = text.trim().slice(0, 300);
  for (const w of BAD_WORDS) {
    const r = new RegExp(`\\b${w}\\b`, "gi");
    t = t.replace(r, "*".repeat(w.length));
  }
  return t;
}

export function useChat(roomId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!roomId) { setMessages([]); return; }
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!active) return;
      setMessages((data ?? []) as ChatMessage[]);
    }
    void load();

    const ch = supabase
      .channel(`chat-${roomId}-${crypto.randomUUID()}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        (p) => setMessages((prev) => [...prev, p.new as ChatMessage].slice(-200)))
      .subscribe();

    return () => { active = false; void supabase.removeChannel(ch); };
  }, [roomId]);

  return messages;
}

export function useSendChat(roomId: string | undefined, playerId: string | undefined, nickname: string, avatar: string) {
  const lastSent = useRef(0);
  return useCallback(async (raw: string) => {
    if (!roomId || !playerId) return false;
    const text = sanitize(raw);
    if (!text) return false;
    const now = Date.now();
    if (now - lastSent.current < 800) return false; // rate-limit 1/0.8s
    lastSent.current = now;
    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId, player_id: playerId, nickname, avatar, text,
    });
    return !error;
  }, [roomId, playerId, nickname, avatar]);
}
