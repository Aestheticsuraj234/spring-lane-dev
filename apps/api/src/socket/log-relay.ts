import type { Server as HttpServer } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { Redis } from "ioredis";
import { Server, type Socket } from "socket.io";
import {
  SOCKET_EVENTS,
  deploymentRoom,
  statusChannel,
  type LogChunkEvent,
  type StatusChangeEvent,
} from "@spring-lane/shared";
import { auth, type Session } from "../auth.js";
import { config } from "../config.js";
import { canAccessDeployment } from "../lib/deployments.js";

type AuthedSocket = Socket & {
  data: {
    session: Session;
  };
};

export function attachLogRelay(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: config.webUrl,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(socket.request.headers),
      });

      if (!session) {
        next(new Error("Unauthorized"));
        return;
      }

      (socket as AuthedSocket).data.session = session;
      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error("Unauthorized"));
    }
  });

  const subscriber = new Redis(config.redisUrl);

  void subscriber.psubscribe("logs:*");
  void subscriber.subscribe(statusChannel());

  subscriber.on("pmessage", (_pattern, channel, message) => {
    if (!channel.startsWith("logs:")) return;

    const deploymentId = channel.slice("logs:".length);
    const event = parseJson<LogChunkEvent>(message);
    if (!event) return;

    io.to(deploymentRoom(deploymentId)).emit(SOCKET_EVENTS.logChunk, event);
  });

  subscriber.on("message", (channel, message) => {
    if (channel !== statusChannel()) return;

    const event = parseJson<StatusChangeEvent>(message);
    if (!event) return;

    io.to(deploymentRoom(event.deploymentId)).emit(
      SOCKET_EVENTS.statusChange,
      event,
    );
  });

  io.on("connection", (socket) => {
    const authed = socket as AuthedSocket;

    socket.on(SOCKET_EVENTS.subscribeDeployment, async (deploymentId: unknown) => {
      if (typeof deploymentId !== "string" || !deploymentId) {
        socket.emit("error", { error: "deploymentId is required" });
        return;
      }

      const allowed = await canAccessDeployment(
        authed.data.session.user.id,
        deploymentId,
      );

      if (!allowed) {
        socket.emit("error", { error: "Forbidden" });
        return;
      }

      await socket.join(deploymentRoom(deploymentId));
    });

    socket.on(SOCKET_EVENTS.unsubscribeDeployment, async (deploymentId: unknown) => {
      if (typeof deploymentId !== "string" || !deploymentId) return;
      await socket.leave(deploymentRoom(deploymentId));
    });
  });

  subscriber.on("error", (error) => {
    console.error("[socket] redis subscriber error:", error);
  });

  io.on("error", (error) => {
    console.error("[socket] server error:", error);
  });

  console.log("[socket] log relay ready");

  return io;
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn("[socket] ignoring invalid pub/sub payload");
    return null;
  }
}
