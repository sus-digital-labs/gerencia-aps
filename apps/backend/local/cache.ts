import { TRPCError } from "@trpc/server";

export class AggregateCache<Value> {
  private readonly entries = new Map<string, { value: Value; expiresAt: number }>();
  private readonly pending = new Map<string, Promise<Value>>();

  constructor(
    private readonly ttlMs: number,
    private readonly capacity: number,
    private readonly maxPending = 2,
  ) {}

  async read(key: string, load: () => Promise<Value>, cacheable: (value: Value) => boolean = () => true) {
    const now = Date.now();
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt > now) {
      this.entries.delete(key);
      this.entries.set(key, entry);
      return { value: entry.value, status: "HIT" as const };
    }
    this.entries.delete(key);

    const running = this.pending.get(key);
    if (running) return { value: await running, status: "SHARED" as const };
    if (this.pending.size >= this.maxPending) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Aguarde a conclusão das consultas em andamento." });
    }

    const started = Promise.resolve().then(load);
    this.pending.set(key, started);
    try {
      const value = await started;
      if (cacheable(value)) {
        if (this.entries.size >= this.capacity) {
          const oldest = this.entries.keys().next().value;
          if (oldest !== undefined) this.entries.delete(oldest);
        }
        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
      }
      return { value, status: "MISS" as const };
    } finally {
      this.pending.delete(key);
    }
  }
}
