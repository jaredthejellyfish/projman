import { closeDB, getDBProjects, initDB } from "./db";
import { getGitHubRepos, getGitHubUser } from "./gh";
import { diffDbAndRepos, reconcileDBWithGitHub } from "./util";
import { select, Separator } from '@inquirer/prompts';

process.env.DEBUG = "true";

async function init() {
  const db = initDB();

  process.on("exit", closeDB.bind(null, db));

  const { user } = await getGitHubUser();

  const repos = await getGitHubRepos(user);

  const projects = getDBProjects(db);

  const { missing, extra } = diffDbAndRepos(projects, repos);

  await reconcileDBWithGitHub(missing, extra, db);
}

await init();
