import { Router } from "express";
import {
  createGithubClient,
  GithubAuthError,
  parseRepoFullName,
} from "../lib/github.js";
import { toBranchDto, toRepoDto } from "../lib/mappers.js";
import { requireAuth } from "../middleware/require-auth.js";

export const reposRouter = Router();

reposRouter.use(requireAuth);

reposRouter.get("/", async (req, res) => {
  try {
    const octokit = await createGithubClient(req);
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      affiliation: "owner,collaborator,organization_member",
    });

    const repos = data
      .filter((repo) => !q || repo.full_name.toLowerCase().includes(q))
      .map((repo) =>
        toRepoDto({
          id: repo.id,
          full_name: repo.full_name,
          private: repo.private,
          default_branch: repo.default_branch ?? "main",
          description: repo.description,
          updated_at: repo.updated_at,
        }),
      );

    res.json({ repos });
  } catch (error) {
    handleGithubRouteError(res, error);
  }
});

reposRouter.get("/:owner/:repo/branches", async (req, res) => {
  try {
    const octokit = await createGithubClient(req);
    const owner = req.params.owner;
    const repo = req.params.repo;
    if (!owner || !repo) {
      res.status(400).json({ error: "Owner and repo are required" });
      return;
    }

    const { data } = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    res.json({
      branches: data.map((branch) => toBranchDto(branch)),
    });
  } catch (error) {
    handleGithubRouteError(res, error);
  }
});

function githubHttpStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function handleGithubRouteError(res: import("express").Response, error: unknown) {
  if (error instanceof GithubAuthError) {
    res.status(401).json({ error: error.message });
    return;
  }

  const status = githubHttpStatus(error);
  if (status === 404) {
    res.status(404).json({ error: "Repository not found or not accessible" });
    return;
  }
  if (status === 401 || status === 403) {
    res.status(403).json({ error: "GitHub access denied" });
    return;
  }

  console.error("[repos]", error);
  res.status(500).json({ error: "Failed to fetch GitHub data" });
}

export { parseRepoFullName };
