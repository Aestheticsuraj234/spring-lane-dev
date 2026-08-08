import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { AppDetailPage } from "@/pages/app-detail-page";
import { AppsPage } from "@/pages/apps-page";
import { LoginPage } from "@/pages/login-page";
import { NewAppPage } from "@/pages/new-app-page";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user ? <AppsPage user={user} /> : null}
          </ProtectedRoute>
        }
      />
      <Route
        path="/apps/new"
        element={
          <ProtectedRoute>
            {user ? <NewAppPage user={user} /> : null}
          </ProtectedRoute>
        }
      />
      <Route
        path="/apps/:id"
        element={
          <ProtectedRoute>
            {user ? (
              <AppDetailRoute user={user} />
            ) : null}
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppDetailRoute({
  user,
}: {
  user: { name?: string | null; email?: string; image?: string | null };
}) {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/" replace />;
  return <AppDetailPage appId={id} user={user} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
