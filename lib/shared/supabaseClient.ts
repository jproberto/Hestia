import { createBrowserClient } from "@supabase/ssr";
import type {
  IDatabaseClient,
  IQueryBuilder,
  QueryResult,
  SingleQueryResult,
} from "./database";

/**
 * Minimal structural view of a Supabase PostgREST chain.
 * We deliberately avoid importing Supabase's builder types so the rest of
 * the codebase only depends on `IDatabaseClient` / `IQueryBuilder`.
 */
interface SupabaseChain {
  select(columns?: string): SupabaseChain;
  insert(data: unknown): SupabaseChain;
  update(data: unknown): SupabaseChain;
  delete(): SupabaseChain;
  upsert(data: unknown, options?: { onConflict?: string }): SupabaseChain;
  eq(column: string, value: unknown): SupabaseChain;
  gte(column: string, value: unknown): SupabaseChain;
  lte(column: string, value: unknown): SupabaseChain;
  order(column: string, options?: { ascending?: boolean }): SupabaseChain;
  is(column: string, value: unknown): SupabaseChain;
  single(): Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
  then<R>(
    onfulfilled: (value: never) => R | PromiseLike<R>,
    onrejected?: (reason: unknown) => R | PromiseLike<R>
  ): PromiseLike<R>;
}

interface SupabaseAuth {
  getUser(): Promise<{ data: { user: { email?: string } | null } }>;
}

interface SupabaseLikeClient {
  from(table: string): SupabaseChain;
  auth: SupabaseAuth;
}

function toError(err: { message: string } | null): Error | null {
  return err ? new Error(err.message) : null;
}

class SupabaseQueryBuilder<T = unknown> implements IQueryBuilder<T> {
  private readonly chain: SupabaseChain;

  constructor(chain: SupabaseChain) {
    this.chain = chain;
  }

  select(columns?: string): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.select(columns));
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.insert(data));
  }

  update(data: Record<string, unknown>): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.update(data));
  }

  delete(): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.delete());
  }

  upsert(data: Record<string, unknown>, options?: { onConflict?: string }): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.upsert(data, options));
  }

  eq(column: string, value: unknown): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.eq(column, value));
  }

  gte(column: string, value: unknown): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.gte(column, value));
  }

  lte(column: string, value: unknown): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.lte(column, value));
  }

  order(column: string, options?: { ascending?: boolean }): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.order(column, options));
  }

  is(column: string, value: null): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.chain.is(column, value));
  }

  async single(): Promise<SingleQueryResult<T>> {
    const { data, error } = await this.chain.single();
    return { data: data as T | null, error: toError(error) };
  }

  async maybeSingle(): Promise<SingleQueryResult<T>> {
    const { data, error } = await this.chain.maybeSingle();
    return { data: data as T | null, error: toError(error) };
  }

  then(
    onfulfilled?: ((value: QueryResult<T>) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null
  ): Promise<QueryResult<T>> {
    return Promise.resolve(
      this.chain.then(
        (value) => {
          const result: QueryResult<T> = {
            data: (value as unknown as { data: T[] | null }).data,
            error: toError(
              (value as unknown as { error: { message: string } | null }).error
            ),
          };
          if (onfulfilled) void onfulfilled(result);
          return result;
        },
        (reason: unknown) => {
          if (onrejected) void onrejected(reason);
          const result: QueryResult<T> = {
            data: null,
            error: reason instanceof Error ? reason : new Error(String(reason)),
          };
          return result;
        }
      )
    );
  }
}

class SupabaseDatabaseClient implements IDatabaseClient {
  private readonly client: SupabaseLikeClient;

  constructor(client: SupabaseLikeClient) {
    this.client = client;
  }

  from<T = unknown>(table: string): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.client.from(table));
  }

  async getUserEmail(): Promise<string | null> {
    const { data } = await this.client.auth.getUser();
    return data.user?.email ?? null;
  }
}

// Singleton por aba (task 47/ARC-003): o cliente Supabase/GoTrue é custoso
// para instanciar, então todos os callers do browser compartilham uma única
// instância por sessão. Callers continuam recebendo `IDatabaseClient`.
// (Testes mockam este módulo, então o cache é transparente para a suíte.)
let cachedBrowserClient: IDatabaseClient | null = null;

export function createBrowserDatabaseClient(): IDatabaseClient {
  if (!cachedBrowserClient) {
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    cachedBrowserClient = new SupabaseDatabaseClient(client as unknown as SupabaseLikeClient);
  }
  return cachedBrowserClient;
}
