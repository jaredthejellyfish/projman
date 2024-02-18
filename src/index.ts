import { closeDB, getDBProjects, initDB } from "./db";
import { getGitHubRepos, getGitHubUser } from "./gh";
import { diffDbAndRepos, reconcileDBWithGitHub } from "./util";
import { Database } from "bun:sqlite";

process.env.DEBUG = "true";

async function init() {
  const db = initDB();

  process.on("exit", closeDB.bind(null, db));

  return db;
}

async function reconcile(db: Database, force: boolean = false) {
  const { user } = await getGitHubUser();

  const repos = await getGitHubRepos(user);

  const projects = getDBProjects(db);

  const { missing, extra } = diffDbAndRepos(projects, repos);

  await reconcileDBWithGitHub(missing, extra, db, force);
}

const db = await init();

await reconcile(db, process.argv.includes("--force"));
