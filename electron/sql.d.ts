declare module 'sql.js' {
  export interface SqlValue {
    bind(values: any[]): void
    step(): boolean
    getAsObject(): Record<string, any>
    run(values?: any[]): void
    free(): void
  }

  export interface Database {
    run(sql: string): void
    exec(sql: string): Array<{ columns: string[]; values: any[][] }>
    prepare(sql: string): SqlValue
    export(): Uint8Array
    close(): void
  }

  export interface InitSqlJsOptions {
    locateFile?: (file: string) => string
  }

  export default function initSqlJs(options?: InitSqlJsOptions): Promise<{
    Database: new (data?: Uint8Array) => Database
  }>
}
