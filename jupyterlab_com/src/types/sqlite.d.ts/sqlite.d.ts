declare module 'sqlite' {
  import { Database } from 'sqlite3';
  export function open(options: { filename: string; driver: Database }): Promise<Database>;
}