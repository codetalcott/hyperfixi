/**
 * Type declarations for better-sqlite3.
 * This is a minimal declaration to support typecheck before npm install.
 * The full types from @types/better-sqlite3 will be used after install.
 */

declare module 'better-sqlite3' {
  namespace BetterSqlite3 {
    interface Database {
      prepare<T = unknown>(sql: string): Statement<T>;
      exec(sql: string): this;
      pragma(pragma: string, options?: { simple?: boolean }): unknown;
      close(): void;
    }

    interface Statement<T = unknown> {
      run(...params: unknown[]): RunResult;
      get(...params: unknown[]): T | undefined;
      all(...params: unknown[]): T[];
    }

    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }

    interface Options {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
      verbose?: (message?: unknown, ...additionalArgs: unknown[]) => void;
    }
  }

  class Database implements BetterSqlite3.Database {
    constructor(filename: string, options?: BetterSqlite3.Options);
    prepare<T = unknown>(sql: string): BetterSqlite3.Statement<T>;
    exec(sql: string): this;
    pragma(pragma: string, options?: { simple?: boolean }): unknown;
    close(): void;
  }

  export = Database;
}
