import { prisma } from "@spring-lane/db";

export class GithubTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubTokenError";
  }
}

export async function getGithubAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "github",
    },
    select: {
      accessToken: true,
    },
  });

  if (!account?.accessToken) {
    throw new GithubTokenError(
      "GitHub access token not found. The app owner must sign in with GitHub again.",
    );
  }

  return account.accessToken;
}
