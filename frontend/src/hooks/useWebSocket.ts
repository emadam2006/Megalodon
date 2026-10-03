import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../api/client";
import { LiveRequestEntry } from "../types";

const STORAGE_KEY = "megalodon_live_requests";

function getCachedRequests(): LiveRequestEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

function persistRequests(reqs: LiveRequestEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs.slice(0, 500)));
  } catch (_) {}
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [liveRequests, setLiveRequests] = useState<LiveRequestEntry[]>(getCachedRequests);
  const [isPaused, setIsPaused] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isPausedRef = useRef(false);

  // Sync recent requests from backend on initial mount
  useEffect(() => {
    api
      .getLiveRequests(200)
      .then((serverReqs) => {
        if (Array.isArray(serverReqs) && serverReqs.length > 0) {
          setLiveRequests((prev) => {
            const seen = new Set(prev.map((r) => r.request_id || `${r.timestamp}-${r.path}`));
            const fresh = serverReqs.filter(
              (r) => !seen.has(r.request_id || `${r.timestamp}-${r.path}`)
            );
            const merged = [...fresh, ...prev].slice(0, 500);
            persistRequests(merged);
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

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
            if (!isPausedRef.current) {
              setLiveRequests((prev) => {
                const next = [data, ...prev.slice(0, 499)];
                persistRequests(next);
                return next;
              });
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
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connect]);

  const clearRequests = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    setLiveRequests([]);
  };

  const togglePause = () => {
    setIsPaused((prev) => {
      isPausedRef.current = !prev;
      return !prev;
    });
  };

  return {
    isConnected,
    liveRequests,
    isPaused,
    togglePause,
    clearRequests,
    lastEvent,
  };
}
