import { $ } from "bun";
import type { GHRepo } from "./types";
import { asyncTimeAndRun } from "./util";

export async function getGitHubUser() {
  return await asyncTimeAndRun(
    async () => {
      const regex = /account\s(\w+)\s/;
      const result = (await $`gh auth status`.text()).split("\n");
      const userLine = result.find((line) => line.includes("Logged in to"));
      const scopesLine = result.find((line) =>
        line.includes("- Token scopes: "),
      );
      let scopes: string[] = [];
      if (scopesLine) {
        scopes = scopesLine
          .split("- Token scopes: ")[1]
          .split(", ")
          .map((scope) => scope.replace(/'/g, ""));
      }

      if (!userLine) {
        throw new Error("No user logged in to GitHub CLI");
      }

      const user = userLine.match(regex)?.pop();

      if (!user) {
        throw new Error("No user logged in to GitHub CLI");
      }

      verifyScopes(scopes, ["repo"]);

      return { user: user, scopes };
    },
    {
      initial: "Getting GitHub user",
      success: "Got GitHub user",
      fail: "Failed to get GitHub user",
    },
  );
}

export async function getGitHubRepos(user: string, limit = 1000) {
  return await asyncTimeAndRun(
    async () => {
      if (!user) {
        throw new Error("No user provided");
      }
      const result =
        await $`gh search repos --owner ${user} --limit ${limit} --json url,name,size,owner,visibility,createdAt`.json();

      return result as GHRepo[];
    },
    {
      initial: "Getting GitHub repos",
      success: "Got GitHub repos",
      fail: "Failed to get GitHub repos",
    },
  );
}

function verifyScopes(scopes: string[], requiredScopes: string[]) {
  const missingScopes = requiredScopes.filter(
    (scope) => !scopes.includes(scope),
  );
  if (missingScopes.length > 0) {
    throw new Error(`Missing required gh scopes: ${missingScopes.join(", ")}`);
  }
}
