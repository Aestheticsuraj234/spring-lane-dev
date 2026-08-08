import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "",
});

export const { signOut, useSession } = authClient;

export async function signInWithGitHub() {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: "/",
  });
}
