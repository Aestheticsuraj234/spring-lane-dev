import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Session } from "../auth.js";

export type AuthedRequest = Request & {
  session: Session;
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  (req as AuthedRequest).session = session;
  next();
}
