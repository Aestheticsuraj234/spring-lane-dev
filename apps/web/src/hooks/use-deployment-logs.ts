import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type LogChunkEvent,
  type StatusChangeEvent,
} from "@spring-lane/shared";

interface UseDeploymentLogsOptions {
  deploymentId: string | null;
  enabled?: boolean;
  initialLogs?: string;
}

export function useDeploymentLogs({
  deploymentId,
  enabled = true,
  initialLogs = "",
}: UseDeploymentLogsOptions) {
  const [logs, setLogs] = useState(initialLogs);
  const [status, setStatus] = useState<StatusChangeEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs, deploymentId]);

  useEffect(() => {
    if (!enabled || !deploymentId) return;

    const socket = io(window.location.origin, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(SOCKET_EVENTS.subscribeDeployment, deploymentId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on(SOCKET_EVENTS.logChunk, (event: LogChunkEvent) => {
      if (event.deploymentId !== deploymentId) return;
      setLogs((prev) => prev + event.chunk);
    });

    socket.on(SOCKET_EVENTS.statusChange, (event: StatusChangeEvent) => {
      if (event.deploymentId !== deploymentId) return;
      setStatus(event);
    });

    return () => {
      socket.emit(SOCKET_EVENTS.unsubscribeDeployment, deploymentId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [deploymentId, enabled]);

  return { logs, status, connected };
}
