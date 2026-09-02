import type { Database } from "./types";

type TableName = keyof Database["public"]["Tables"];
type ChangeEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  schema: "public";
  table: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}


declare global {
  interface Window {
    __PARTYBOX_TEST_FIRE_REALTIME__?: (payload: ChangeEvent) => void;
  }
}

class LocalRealtimeStore {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(event: ChangeEvent) => void>();
  private memStore = new Map<string, string>();


  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("partybox_realtime");
        this.channel.onmessage = (e) => {
          if (e.data && e.data.type === "DB_CHANGE") {
            this.notify(e.data.payload);
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  private getKey(table: string): string {
    return "partybox_tbl_" + table;
  }

  getTable(table: string): Record<string, unknown>[] {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      const m = this.memStore.get(this.getKey(table));
      return m ? JSON.parse(m) : [];
    }
    try {
      const raw = localStorage.getItem(this.getKey(table));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }


  setTable(table: string, rows: Record<string, unknown>[]) {
    const json = JSON.stringify(rows);
    this.memStore.set(this.getKey(table), json);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(this.getKey(table), json);
      } catch {
        // ignore quota errors
      }
    }
  }


  subscribe(listener: (event: ChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }


  notify(event: ChangeEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error("Listener error:", err);
      }
    }
  }


  emit(
    eventType: "INSERT" | "UPDATE" | "DELETE",
    table: string,
    newRow: Record<string, unknown>,
    oldRow: Record<string, unknown> = {},
  ) {
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

export const localStore = new LocalRealtimeStore();


async function yieldPromise<T>(value: T): Promise<T> {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), 0));
}


async function executeLocalQuery(builder: any) {
  const table = builder.tableName;
  const currentRows = localStore.getTable(table);


  if (builder.mode === "insert" && builder.insertPayload) {
    const inserted: Record<string, unknown>[] = [];
    for (const item of builder.insertPayload) {
      const row: Record<string, unknown> = {
        id: item.id || generateId(),
        created_at: item.created_at || new Date().toISOString(),
        ...item,
      };
      currentRows.push(row);
      inserted.push(row);
      localStore.emit("INSERT", table, row);
    }
    localStore.setTable(table, currentRows);
    return { data: inserted, error: null };
  }


  if (builder.mode === "update" && builder.updatePayload) {
    const updatedRows: Record<string, unknown>[] = [];
    for (let i = 0; i < currentRows.length; i++) {
      const row = currentRows[i]!;
      if (builder.matches(row)) {
        const oldRow = { ...row };
        const newRow = {
          ...row,
          ...builder.updatePayload,
          updated_at: new Date().toISOString(),
        };
        currentRows[i] = newRow;
        updatedRows.push(newRow);
        localStore.emit("UPDATE", table, newRow, oldRow);
      }
    }
    if (updatedRows.length > 0) {
      localStore.setTable(table, currentRows);
    }
    return { data: updatedRows, error: null };
  }


  if (builder.mode === "delete") {
    const kept: Record<string, unknown>[] = [];
    const deleted: Record<string, unknown>[] = [];
    for (const row of currentRows) {
      if (builder.matches(row)) {
        deleted.push(row);
        localStore.emit("DELETE", table, {}, row);
      } else {
        kept.push(row);
      }
    }
    localStore.setTable(table, kept);
    return { data: deleted, error: null };
  }


  // Select mode
  let rows = currentRows.filter((r: any) => builder.matches(r));


  if (builder.orderField) {
    const field = builder.orderField;
    const asc = builder.orderAsc;
    rows.sort((a: any, b: any) => {
      const va = a[field];
      const vb = b[field];
      if (va == null) return asc ? -1 : 1;
      if (vb == null) return asc ? 1 : -1;
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
  }


  if (builder.limitCount !== null) {
    rows = rows.slice(0, builder.limitCount);
  }


  return { data: rows, error: null };
}

class LocalQueryBuilder {
  public tableName: string;
  public mode: "select" | "insert" | "update" | "delete" = "select";
  public insertPayload: Record<string, unknown>[] | null = null;
  public updatePayload: Record<string, unknown> | null = null;
  public filters: Array<(row: Record<string, unknown>) => boolean> = [];
  public orderField: string | null = null;
  public orderAsc = true;
  public limitCount: number | null = null;


  constructor(tableName: string) {
    this.tableName = tableName;
  }


  select(_cols?: string) {
    if (this.mode !== "insert" && this.mode !== "update") {
      this.mode = "select";
    }
    return this;
  }


  insert(data: Record<string, unknown> | Record<string, unknown>[]) {
    this.mode = "insert";
    this.insertPayload = Array.isArray(data) ? data : [data];
    return this;
  }


  update(data: Record<string, unknown>) {
    this.mode = "update";
    this.updatePayload = data;
    return this;
  }


  delete() {
    this.mode = "delete";
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


  is(column: string, value: unknown) {
    this.filters.push((row) => {
      if (value === null) return row[column] === null || row[column] === undefined;
      return row[column] === value;
    });
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


  public matches(row: Record<string, unknown>): boolean {
    return this.filters.every((f) => f(row));
  }


  async maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: null }> {
    const res = await executeLocalQuery(this);
    const first = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return yieldPromise({
      data: first,
      error: null,
    });
  }


  async single(): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
    const res = await executeLocalQuery(this);
    const first = Array.isArray(res.data) ? res.data[0] || null : res.data;
    return yieldPromise({
      data: first,
      error: first ? null : new Error("Row not found"),
    });
  }


  then<TResult1 = any>(
    onfulfilled?: ((value: { data: any; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
  ): Promise<TResult1> {
    return executeLocalQuery(this).then((res) => {
      const finalRes = {
        data: res.data,
        error: null,
      };
      return yieldPromise(finalRes).then(onfulfilled as any);
    });
  }
}

export const supabase = {
  from(tableName: TableName | string) {
    return new LocalQueryBuilder(tableName);
  },


  async rpc(funcName: string, _args?: unknown) {
    return yieldPromise({ data: new Date().toISOString(), error: null });
  },


  channel(name: string) {
    const subs: Array<{
      table?: string;
      filter?: string;
      callback: (payload: ChangeEvent) => void;
    }> = [];


    let unsubscribeLocal: (() => void) | null = null;


    const channelObj = {
      on(_event: string, opts: { schema?: string; table?: string; filter?: string }, callback: (p: ChangeEvent) => void) {
        subs.push({
          table: opts.table,
          filter: opts.filter,
          callback,
        });
        return channelObj;
      },


      subscribe(callback?: (status: string) => void) {
        unsubscribeLocal = localStore.subscribe((event) => {
          for (const sub of subs) {
            if (sub.table && sub.table !== event.table) continue;
            if (sub.filter) {
              const match = sub.filter.match(/^([^=]+=)?eq\.(.+)$/);
              if (match) {
                const col = match[1] ? match[1].replace("=", "") : "code";
                const val = match[2];
                const rowVal = (event.new as any)[col] ?? (event.old as any)[col];
                if (String(rowVal) !== String(val)) continue;
              }
            }
            sub.callback(event);
          }
        });


        if (callback) {
          setTimeout(() => callback("SUBSCRIBED"), 0);
        }
        return channelObj;
      },


      unsubscribe() {
        if (unsubscribeLocal) unsubscribeLocal();
      },
    };


    return channelObj;
  },


  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  },
};
