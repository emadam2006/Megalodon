import { useEffect, useRef, useState, useCallback } from "react";
import { LiveRequestEntry } from "../types";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [liveRequests, setLiveRequests] = useState<LiveRequestEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          if (type === "LIVE_REQUEST") {
            if (!isPaused) {
              setLiveRequests((prev) => [data, ...prev.slice(0, 199)]);
            }
          } else if (type === "ALERT_TRIGGERED" || type === "NETWORK_EVENT") {
            setLastEvent({ type, data, timestamp: new Date() });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (_) {
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [isPaused]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  const clearRequests = () => setLiveRequests([]);
  const togglePause = () => setIsPaused((prev) => !prev);

  return {
    isConnected,
    liveRequests,
    isPaused,
    togglePause,
    clearRequests,
    lastEvent,
  };
}
