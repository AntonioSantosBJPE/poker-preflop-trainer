import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveGroup,
  createGroup,
  getGroupOrThrow,
  listGroups,
  renameGroup,
} from "./groups";
import * as schema from "./schema";
import { situationGroups, situations, users } from "./schema";

vi.mock("better-sqlite3");

async function createTestDb() {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.run(`PRAGMA foreign_keys = ON`);
  sqlite.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE situation_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE UNIQUE INDEX uq_groups_user_name ON situation_groups (user_id, name);
    CREATE TABLE situations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      group_id INTEGER NOT NULL REFERENCES situation_groups(id),
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      description TEXT,
      effective_stack REAL NOT NULL DEFAULT 100,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  return drizzle(sqlite, { schema });
}

describe("groups DB", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  function seedUser(email = "u@test.local") {
    const now = new Date();
    const rows = db
      .insert(users)
      .values({ name: "Test", email, passwordHash: "x", createdAt: now })
      .returning({ id: users.id })
      .all();
    return rows[0]!.id;
  }

  describe("listGroups", () => {
    it("returns empty when user has no active groups", async () => {
      const userId = seedUser();
      await expect(listGroups(db, userId)).resolves.toEqual([]);
    });

    it("returns active groups with correct active situation counts and sortOrder", async () => {
      const userId = seedUser();
      const now = new Date();

      db.insert(situationGroups)
        .values([
          {
            userId,
            name: "G-B",
            sortOrder: 1,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            name: "G-A",
            sortOrder: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            name: "Hidden",
            sortOrder: 2,
            isActive: false,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();

      const groups = db
        .select()
        .from(situationGroups)
        .where(eq(situationGroups.userId, userId))
        .all();
      const gA = groups.find((g) => g.name === "G-A")!;
      const gB = groups.find((g) => g.name === "G-B")!;

      db.insert(situations)
        .values([
          {
            userId,
            groupId: gA.id,
            name: "S1",
            position: "UTG",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            groupId: gA.id,
            name: "S-inact",
            position: "CO",
            isActive: false,
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            groupId: gB.id,
            name: "S2",
            position: "BB",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            groupId: gB.id,
            name: "S3",
            position: "BTN",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();

      const list = await listGroups(db, userId);
      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({
        name: "G-A",
        sortOrder: 0,
        isActive: true,
        situationCount: 1,
      });
      expect(list[1]).toMatchObject({
        name: "G-B",
        sortOrder: 1,
        isActive: true,
        situationCount: 2,
      });
    });
  });

  describe("createGroup", () => {
    it("returns inserted id on success", async () => {
      const userId = seedUser();
      await expect(createGroup(db, userId, "My group")).resolves.toEqual({
        id: expect.any(Number),
      });
      const rows = db.select().from(situationGroups).all();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        name: "My group",
        sortOrder: 0,
        isActive: true,
      });
    });

    it("throws when name already exists for user (including inactive)", async () => {
      const userId = seedUser();
      const now = new Date();
      db.insert(situationGroups)
        .values({
          userId,
          name: "Dup",
          sortOrder: 0,
          isActive: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      await expect(createGroup(db, userId, "Dup")).rejects.toThrow(
        "Nome de grupo já existe"
      );
    });
  });

  describe("renameGroup", () => {
    it("updates name when unique", async () => {
      const userId = seedUser();
      const now = new Date();
      const inserted = db
        .insert(situationGroups)
        .values({
          userId,
          name: "Old",
          sortOrder: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: situationGroups.id })
        .all();
      await renameGroup(db, userId, inserted[0]!.id, "New");
      const row = db
        .select()
        .from(situationGroups)
        .where(eq(situationGroups.id, inserted[0]!.id))
        .get();
      expect(row?.name).toBe("New");
    });

    it("throws when name collides with another group", async () => {
      const userId = seedUser();
      const now = new Date();
      db.insert(situationGroups)
        .values([
          {
            userId,
            name: "Alpha",
            sortOrder: 0,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            name: "Beta",
            sortOrder: 1,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();
      const beta = db
        .select({ id: situationGroups.id })
        .from(situationGroups)
        .where(eq(situationGroups.name, "Beta"))
        .get()!;
      await expect(renameGroup(db, userId, beta.id, "Alpha")).rejects.toThrow(
        "Nome de grupo já existe"
      );
    });
  });

  describe("archiveGroup", () => {
    it("soft-deletes group and its situations", async () => {
      const userId = seedUser();
      const now = new Date();
      const gidRows = db
        .insert(situationGroups)
        .values({
          userId,
          name: "G",
          sortOrder: 0,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: situationGroups.id })
        .all();
      const gid = gidRows[0]!.id;
      db.insert(situations)
        .values([
          {
            userId,
            groupId: gid,
            name: "S-one",
            position: "UTG",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            userId,
            groupId: gid,
            name: "S-two",
            position: "CO",
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();

      await archiveGroup(db, userId, gid);

      const g = db
        .select()
        .from(situationGroups)
        .where(eq(situationGroups.id, gid))
        .get();
      expect(g?.isActive).toBe(false);
      const sits = db
        .select()
        .from(situations)
        .where(eq(situations.groupId, gid))
        .all();
      expect(sits.every((s) => s.isActive === false)).toBe(true);
    });

    it("throws when group not found", async () => {
      const userId = seedUser();
      await expect(archiveGroup(db, userId, 99999)).rejects.toThrow(
        "Grupo não encontrado"
      );
    });
  });

  describe("getGroupOrThrow", () => {
    it("throws when missing", async () => {
      const userId = seedUser();
      await expect(getGroupOrThrow(db, userId, 42)).rejects.toThrow(
        "Grupo não encontrado"
      );
    });

    it("returns row when present", async () => {
      const userId = seedUser();
      const now = new Date();
      const inserted = db
        .insert(situationGroups)
        .values({
          userId,
          name: "X",
          sortOrder: 3,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .all();
      await expect(
        getGroupOrThrow(db, userId, inserted[0]!.id)
      ).resolves.toMatchObject({
        id: inserted[0]!.id,
        name: "X",
        sortOrder: 3,
      });
    });
  });
});
