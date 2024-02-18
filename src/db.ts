import { Database } from "bun:sqlite";
import type { DatabaseProject, GHRepo } from "./types";
import { resolveProjectPath, syncTimeAndRun } from "./util";

const initQueryStatement = `
CREATE TABLE IF NOT EXISTS projects (
  createdAt TEXT,
  name TEXT,
  owner_id TEXT,
  size INTEGER,
  url TEXT,
  visibility TEXT,
  path TEXT,
  submodule TEXT
);`;

const insertProjectQuery = `
INSERT INTO projects (
  createdAt,
  name,
  owner_id,
  size,
  url,
  visibility,
  path,
  submodule
) VALUES (
  $createdAt,
  $name,
  $owner_id,
  $size,
  $url,
  $visibility,
  $path,
  $submodule
)
`;

const getProjectsQuery = "SELECT * FROM projects;";

export function initDB() {
  return syncTimeAndRun(
    () => {
      const db = new Database("projects.sqlite");
      db.exec("PRAGMA journal_mode = WAL;");

      const tables = db
        .query("SELECT name FROM sqlite_master WHERE type='table';")
        .all() as { name: string }[];

      const doesProjectsExist = tables.some(
        (table) => table.name === "projects",
      );

      if (!doesProjectsExist) {
        db.exec(initQueryStatement);
      }
      return db;
    },
    {
      initial: "Initializing database",
      success: "Database initialized",
      fail: "Failed to initialize database",
    },
  );
}

export function getDBProjects(db: Database) {
  return syncTimeAndRun(
    () => db.query(getProjectsQuery).all() as DatabaseProject[],
    {
      initial: "Fetching db projects",
      success: "DB projects fetched",
      fail: "Failed to fetch db projects",
    },
  );
}

export function closeDB(db: Database) {
  return syncTimeAndRun(() => db.close(), {
    initial: "Closing database",
    success: "Database closed",
    fail: "Failed to close database",
  });
}

export async function addProjectToDB(
  project: GHRepo,
  db: Database,
  force: boolean = false,
) {
  try {
    const path = await resolveProjectPath(project, force);

    if (!path) {
      console.error(
        `⚠️ Failed to resolve path for project ${project.name}. Skipping...`,
      );
      return;
    }

    const insertProject = db.query(insertProjectQuery);
    insertProject.values({
      $createdAt: new Date().toISOString(),
      $name: project.name,
      $owner_id: project.owner_id,
      $size: project.size,
      $url: project.url,
      $visibility: project.visibility,
      $path: path,
      $submodule: "",
    });
  } catch (error) {
    console.error(
      `⚠️ Failed to add project ${project.name} to db. Skipping...`,
    );
    if (process.env.DEBUG === "true") {
      console.error(error);
    }
  }
}
