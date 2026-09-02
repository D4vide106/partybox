import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Default Supabase project credentials (from environment or defaults)
const SUPABASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://bqcmjajeytfrgpcobrfh.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_pN9jvyms1XGuOjwcrr_d9Q_7pcu2g5a";

// ---------------------------------------------------------------------------
// Local / Broadcast Realtime Fallback Store
// ---------------------------------------------------------------------------

type TableName = keyof Database["public"]["Tables"];
type ChangeEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: "public";
  table: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

class LocalRealtimeStore {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(event: ChangeEvent) => void>();

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("partybox_realtime");
      this.channel.onmessage = (e) => {
        if (e.data && e.data.type === "DB_CHANGE") {
          this.notify(e.data.payload);
        }
      };
    }
  }

  private getKey(table: string): string {
    return `partybox_tbl_${table}`;
  }

  getTable(table: string): Record<string, unknown>[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(this.getKey(table));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  setTable(table: string, rows: Record<string, unknown>[]) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.getKey(table), JSON.stringify(rows));
    } catch {
      // ignore storage quota errors
    }
  }

  subscribe(listener: (event: ChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: ChangeEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Listener error:", err);
      }
    }
  }

  emit(eventType: "INSERT" | "UPDATE" | "DELETE", table: string, newRow: Record<string, unknown>, oldRow: Record<string, unknown> = {}) {
    const payload: ChangeEvent = {
      eventType,
      schema: "public",
      table,
      new: newRow,
      old: oldRow,
    };
    this.notify(payload);
    if (this.channel) {
      try {
        this.channel.postMessage({ type: "DB_CHANGE", payload });
      } catch {
        // ignore
      }
    }
  }
}

const localStore = new LocalRealtimeStore();

// Query Builder for local storage fallback
class LocalQueryBuilder {
  private tableName: string;
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private orderField: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_cols?: string) {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => String(row[column]) === String(value));
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => String(row[column]) !== String(value));
    return this;
  }

  in(column: string, values: unknown[]) {
    const set = new Set(values.map((v) => String(v)));
    this.filters.push((row) => set.has(String(row[column])));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderField = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async insert(data: Record<string, unknown> | Record<string, unknown>[]) {
    const rows = localStore.getTable(this.tableName);
    const items = Array.isArray(data) ? data : [data];
    const inserted: Record<string, unknown>[] = [];

    for (const item of items) {
      const row: Record<string, unknown> = {
        id: item.id || crypto.randomUUID(),
        created_at: item.created_at || new Date().toISOString(),
        ...item,
      };
      rows.push(row);
      inserted.push(row);
      localStore.emit("INSERT", this.tableName, row);
    }

    localStore.setTable(this.tableName, rows);

    return {
      data: Array.isArray(data) ? inserted : inserted[0],
      error: null,
      select: () => ({
        single: async () => ({ data: inserted[0], error: null }),
        maybeSingle: async () => ({ data: inserted[0] || null, error: null }),
      }),
    };
  }

  async update(data: Record<string, unknown>) {
    const rows = localStore.getTable(this.tableName);
    let updatedCount = 0;
    const updatedRows: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (this.matches(row)) {
        const oldRow = { ...row };
        const newRow = {
          ...row,
          ...data,
          updated_at: new Date().toISOString(),
        };
        rows[i] = newRow;
        updatedRows.push(newRow);
        updatedCount++;
        localStore.emit("UPDATE", this.tableName, newRow, oldRow);
      }
    }

    if (updatedCount > 0) {
      localStore.setTable(this.tableName, rows);
    }

    return {
      data: updatedRows,
      error: null,
      eq: (col: string, val: unknown) => this.eq(col, val),
      select: () => ({
        single: async () => ({ data: updatedRows[0] || null, error: null }),
        maybeSingle: async () => ({ data: updatedRows[0] || null, error: null }),
      }),
    };
  }

  async delete() {
    const rows = localStore.getTable(this.tableName);
    const kept: Record<string, unknown>[] = [];

    for (const row of rows) {
      if (this.matches(row)) {
        localStore.emit("DELETE", this.tableName, {}, row);
      } else {
        kept.push(row);
      }
    }

    localStore.setTable(this.tableName, kept);
    return {
      data: null,
      error: null,
      eq: (col: string, val: unknown) => this.eq(col, val),
    };
  }

  private matches(row: Record<string, unknown>): boolean {
    return this.filters.every((f) => f(row));
  }

  private execute(): Record<string, unknown>[] {
    let rows = localStore.getTable(this.tableName).filter((r) => this.matches(r));

    if (this.orderField) {
      const field = this.orderField;
      const asc = this.orderAsc;
      rows.sort((a, b) => {
        const va = a[field];
        const vb = b[field];
        if (va == null) return asc ? -1 : 1;
        if (vb == null) return asc ? 1 : -1;
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    return rows;
  }

  async maybeSingle() {
    const rows = this.execute();
    return { data: rows[0] || null, error: null };
  }

  async single() {
    const rows = this.execute();
    return { data: rows[0] || null, error: rows.length ? null : new Error("Row not found") };
  }

  then<TResult1 = { data: Record<string, unknown>[]; error: null }>(
    onfulfilled?: ((value: { data: Record<string, unknown>[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
  ): Promise<TResult1> {
    const res = { data: this.execute(), error: null };
    return Promise.resolve(onfulfilled ? onfulfilled(res) : (res as unknown as TResult1));
  }
}

// ---------------------------------------------------------------------------
// Hybrid Supabase Client (Real Supabase + Transparent Local Fallback)
// ---------------------------------------------------------------------------

let realSupabase: ReturnType<typeof createClient<Database>> | null = null;
let networkFailed = false;

try {
  if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
    realSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== "undefined" ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
} catch {
  networkFailed = true;
}

export const supabase = {
  from(tableName: TableName | string) {
    if (networkFailed || !realSupabase) {
      return new LocalQueryBuilder(tableName);
    }

    const realBuilder = (realSupabase as any).from(tableName);
    return new Proxy(realBuilder, {
      get(target, prop) {
        const orig = target[prop];
        if (typeof orig === "function") {
          return (...args: any[]) => {
            try {
              const res = orig.apply(target, args);
              if (res && typeof res.then === "function") {
                return res.catch((err: any) => {
                  console.warn(`[Supabase fallback] Network failed on table ${tableName}, switching to local store:`, err?.message);
                  networkFailed = true;
                  const local = new LocalQueryBuilder(tableName);
                  return (local as any)[prop](...args);
                });
              }
              return res;
            } catch (err) {
              console.warn(`[Supabase fallback] Error calling ${String(prop)}:`, err);
              networkFailed = true;
              const local = new LocalQueryBuilder(tableName);
              return (local as any)[prop](...args);
            }
          };
        }
        return orig;
      },
    });
  },

  async rpc(funcName: string, _args?: unknown) {
    if (funcName === "get_server_time") {
      return { data: new Date().toISOString(), error: null };
    }
    if (realSupabase && !networkFailed) {
      try {
        const res = await (realSupabase.rpc as any)(funcName, _args);
        if (!res.error) return res;
      } catch {
        // fallback
      }
    }
    return { data: new Date().toISOString(), error: null };
  },

  channel(name: string) {
    const subs: Array<{
      table?: string;
      filter?: string;
      callback: (payload: ChangeEvent) => void;
    }> = [];

    let unsubscribeLocal: (() => void) | null = null;
    let realChannel: any = null;

    if (realSupabase && !networkFailed) {
      try {
        realChannel = realSupabase.channel(name);
      } catch {
        realChannel = null;
      }
    }

    const channelObj = {
      on(event: string, opts: { schema?: string; table?: string; filter?: string }, callback: (p: ChangeEvent) => void) {
        subs.push({
          table: opts.table,
          filter: opts.filter,
          callback,
        });
        if (realChannel) {
          try {
            realChannel.on(event, opts, callback);
          } catch {
            // ignore
          }
        }
        return channelObj;
      },

      subscribe(callback?: (status: string) => void) {
        unsubscribeLocal = localStore.subscribe((event) => {
          for (const sub of subs) {
            if (sub.table && sub.table !== event.table) continue;
            if (sub.filter) {
              // Parse simple filters like `code=eq.1234` or `room_id=eq.xyz`
              const match = sub.filter.match(/^(\w+)=eq\.(.+)$/);
              if (match) {
                const [, col, val] = match;
                const rowVal = event.new[col!] ?? event.old[col!];
                if (String(rowVal) !== String(val)) continue;
              }
            }
            sub.callback(event);
          }
        });

        if (realChannel) {
          try {
            realChannel.subscribe(callback);
          } catch {
            if (callback) callback("SUBSCRIBED");
          }
        } else {
          if (callback) callback("SUBSCRIBED");
        }
        return channelObj;
      },

      unsubscribe() {
        if (unsubscribeLocal) unsubscribeLocal();
        if (realChannel) {
          try {
            realChannel.unsubscribe();
          } catch {
            // ignore
          }
        }
      },
    };

    return channelObj;
  },

  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
    if (realSupabase && !networkFailed) {
      try {
        realSupabase.removeChannel(channel);
      } catch {
        // ignore
      }
    }
  },
};
