import ora from "ora";
import type { DatabaseProject, GHRepo, SpinnerMessages } from "./types";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { confirm } from "@inquirer/prompts";
import { $ } from "bun";
import { type Database } from "bun:sqlite";
import { addProjectToDB } from "./db";
import chalk from "chalk";

export function syncTimeAndRun<T>(
  fn: (...args: any[]) => T,
  spinner: SpinnerMessages,
  ...args: any[]
): T {
  const startTime = performance.now();
  const actionSpinner = ora(spinner.initial).start();
  try {
    const result = fn(...args);
    const endTime = performance.now();
    actionSpinner.succeed(
      `${spinner.success} in ${(endTime - startTime).toFixed(
        spinner.resolution || 2
      )}ms`
    );
    return result;
  } catch (error) {
    actionSpinner.fail(spinner.fail);
    if (process.env.DEBUG === "true") {
      console.error(error);
    }
    process.exit(1);
  }
}

export async function asyncTimeAndRun<T>(
  fn: (...args: any[]) => Promise<T>,
  spinner: SpinnerMessages,
  ...args: any[]
): Promise<T> {
  const startTime = performance.now();
  const actionSpinner = ora(spinner.initial).start();
  try {
    const result = await fn(...args);
    const endTime = performance.now();
    actionSpinner.succeed(
      `${spinner.success} in ${(endTime - startTime).toFixed(
        spinner.resolution || 2
      )}ms`
    );
    return result;
  } catch (error) {
    actionSpinner.fail(spinner.fail);
    if (process.env.DEBUG === "true") {
      console.error(error);
    }
    process.exit(1);
  }
}

export function diffDbAndRepos(
  databaseProjects: DatabaseProject[],
  repos: GHRepo[]
) {
  const missing = repos.filter(
    (repo) => !databaseProjects.some((project) => project.name === repo.name)
  );

  const extraProjects = databaseProjects.filter(
    (project) => !repos.some((repo) => repo.name === project.name)
  );

  return { missing, extra: extraProjects };
}

export async function resolveProjectPath(
  project: GHRepo
): Promise<string | null> {
  // Get the current directory
  const currentDir = process.cwd();

  // Look for a folder with a name similar to project.name
  const folders = await readdir(currentDir);
  const similarFolder = folders.find(
    (folder) => folder.toLowerCase() === project.name.toLowerCase()
  );

  if (similarFolder) {
    // Return the full path to the similar folder
    return join(currentDir, similarFolder);
  } else {
    // If no similar folder is found, return null

    const result = await confirm({
      message: `Failed to resolve ${project.name}'s path, would you like to clone the repo?`,
    });

    if (result) {
      const res = await $`git clone ${project.url}`.quiet();
      if (res.exitCode === 0) {
        return join(currentDir, project.name);
      } else {
        throw new Error(`Failed to clone ${project.url}`);
      }
    } else {
      return null;
    }
  }
}

export async function reconcileDBWithGitHub(
  add: GHRepo[],
  remove: GHRepo[],
  db: Database
) {
  if (add.length === 0 && remove.length === 0) {
    console.log(
      chalk.green("✔ No differences found between local db and github.")
    );
    process.exit(0);
  }

  if (add.length > 0) {
    console.log(
      chalk.yellow(
        `\n⚠️ Found ${add.length} projects in github but not in local db.`
      )
    );

    const result = await confirm({
      message: "Would you like to add these projects to the local db?",
    });

    if (!result) {
      console.log(chalk.yellow("Skipping adding projects to local db\n"));
    } else {
      console.log("");
      for (const project of add) {
        await addProjectToDB(project, db);
      }
    }
  }

  if (remove.length > 0) {
    console.log(
      chalk.yellow(
        `⚠️ Found ${remove.length} projects in local db but not in github.`
      )
    );
  }
}
