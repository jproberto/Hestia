/**
 * Minimal database abstraction over Supabase.
 *
 * Layers above `lib/shared` and `utils/supabase` must depend on these
 * interfaces — never on `@supabase/supabase-js` types directly.
 * The query builder is thenable so `await db.from(...).select(...)`
 * keeps working exactly like the Supabase client.
 */

export interface QueryResult<T> {
  data: T[] | null;
  error: Error | null;
}

export interface SingleQueryResult<T> {
  data: T | null;
  error: Error | null;
}

export interface IQueryBuilder<T = unknown> {
  select(columns?: string): IQueryBuilder<T>;
  insert(data: Record<string, unknown> | Record<string, unknown>[]): IQueryBuilder<T>;
  update(data: Record<string, unknown>): IQueryBuilder<T>;
  delete(): IQueryBuilder<T>;
  upsert(data: Record<string, unknown>, options?: { onConflict?: string }): IQueryBuilder<T>;
  eq(column: string, value: unknown): IQueryBuilder<T>;
  gte(column: string, value: unknown): IQueryBuilder<T>;
  lte(column: string, value: unknown): IQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): IQueryBuilder<T>;
  is(column: string, value: null): IQueryBuilder<T>;
  single(): Promise<SingleQueryResult<T>>;
  maybeSingle(): Promise<SingleQueryResult<T>>;
  then(
    onfulfilled?: ((value: QueryResult<T>) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null
  ): Promise<QueryResult<T>>;
}

export interface IDatabaseClient {
  from<T = unknown>(table: string): IQueryBuilder<T>;
  /** Returns the authenticated user's email, or null when signed out. */
  getUserEmail(): Promise<string | null>;
}
