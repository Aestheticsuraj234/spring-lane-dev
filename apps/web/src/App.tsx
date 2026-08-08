import { authClient, signOut } from "./lib/auth-client.js";

async function signInWithGitHub() {
  await authClient.signIn.social({
    provider: "github",
    callbackURL: "/",
  });
}

export default function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <main className="placeholder">
        <p>Loading session…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="placeholder">
        <h1>Spring Lane</h1>
        <p>One-click Spring Boot deploys for any GitHub account.</p>
        <button type="button" className="btn" onClick={() => signInWithGitHub()}>
          Sign in with GitHub
        </button>
      </main>
    );
  }

  const user = session.user;

  return (
    <main className="placeholder">
      <h1>Spring Lane</h1>
      <p>Signed in as {user.name ?? user.email}</p>
      {user.image ? (
        <img src={user.image} alt="" className="avatar" width={48} height={48} />
      ) : null}
      <button type="button" className="btn btn-secondary" onClick={() => signOut()}>
        Sign out
      </button>
    </main>
  );
}
