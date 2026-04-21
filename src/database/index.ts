import Database from "@tauri-apps/plugin-sql";
import { isBoolean } from "es-toolkit";
import { Kysely, sql } from "kysely";
import { TauriSqliteDialect } from "kysely-dialect-tauri";
import { SerializePlugin } from "kysely-plugin-serialize";
import type { DatabaseSchema } from "@/types/database";
import { getSaveDatabasePath } from "@/utils/path";

let db: Kysely<DatabaseSchema> | null = null;

export const getDatabase = async () => {
  if (db) return db;

  const path = await getSaveDatabasePath();

  db = new Kysely<DatabaseSchema>({
    dialect: new TauriSqliteDialect({
      database: (prefix) => Database.load(prefix + path),
    }),
    plugins: [
      new SerializePlugin({
        deserializer: (value) => value,
        serializer: (value) => {
          if (isBoolean(value)) {
            return Number(value);
          }

          return value;
        },
      }),
    ],
  });

  await db.schema
    .createTable("history")
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("type", "text")
    .addColumn("group", "text")
    .addColumn("value", "text")
    .addColumn("search", "text")
    .addColumn("count", "integer")
    .addColumn("width", "integer")
    .addColumn("height", "integer")
    .addColumn("favorite", "integer", (col) => col.defaultTo(0))
    .addColumn("createTime", "text")
    .addColumn("firstCopyTime", "text")
    .addColumn("lastCopyTime", "text")
    .addColumn("copyTimes", "integer", (col) => col.defaultTo(1))
    .addColumn("note", "text")
    .addColumn("sourceAppName", "text")
    .addColumn("sourceAppPath", "text")
    .addColumn("subtype", "text")
    .execute();

  const ensureColumn = async (name: string, type: string) => {
    try {
      await sql
        .raw(`ALTER TABLE history ADD COLUMN ${name} ${type}`)
        .execute(db);
    } catch {}
  };

  await ensureColumn("firstCopyTime", "TEXT");
  await ensureColumn("lastCopyTime", "TEXT");
  await ensureColumn("copyTimes", "INTEGER DEFAULT 1");
  await ensureColumn("sourceAppName", "TEXT");
  await ensureColumn("sourceAppPath", "TEXT");

  await sql`
    UPDATE history
    SET
      firstCopyTime = COALESCE(firstCopyTime, createTime),
      lastCopyTime = COALESCE(lastCopyTime, createTime),
      copyTimes = COALESCE(copyTimes, 1)
  `.execute(db);

  return db;
};

export const destroyDatabase = async () => {
  const db = await getDatabase();

  return db.destroy();
};
