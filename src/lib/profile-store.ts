import { DatabaseSync } from "node:sqlite";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

// Separate from Tide identity attributes, roles, evidence policies, and governance.
// This single-VM SQLite store contains self-asserted presentation names in plaintext.
export function openProfileStore(filename: string) {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS profiles (
      issuer TEXT NOT NULL,
      subject TEXT NOT NULL,
      display_name TEXT NOT NULL,
      PRIMARY KEY (issuer, subject)
    );
  `);
  const read = db.prepare("SELECT display_name FROM profiles WHERE issuer = ? AND subject = ?");
  const write = db.prepare(`INSERT INTO profiles (issuer, subject, display_name) VALUES (?, ?, ?)
    ON CONFLICT (issuer, subject) DO UPDATE SET display_name = excluded.display_name`);
  return {
    get(issuer: string, subject: string): string | null {
      const row = read.get(issuer, subject) as { display_name: string } | undefined;
      return row?.display_name ?? null;
    },
    set(issuer: string, subject: string, name: string) { write.run(issuer, subject, name); },
    close() { db.close(); },
  };
}

let store: ReturnType<typeof openProfileStore> | undefined;
export function profileStore() {
  return store ??= openProfileStore(join(process.cwd(), "data", "profiles.sqlite"));
}
