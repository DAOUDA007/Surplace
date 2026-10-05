"use client";

import { useEffect, useRef } from "react";
import type { ServerEvent } from "@/lib/types";

/** S'abonne au flux temps réel du serveur ; le navigateur se reconnecte automatiquement. */
export function useServerEvents(onEvent: (event: ServerEvent) => void, onReconnect?: () => void) {
  const handlerRef = useRef(onEvent);
  const reconnectRef = useRef(onReconnect);
  handlerRef.current = onEvent;
  reconnectRef.current = onReconnect;

  useEffect(() => {
    const source = new EventSource("/api/events");
    let opened = false;
    source.onopen = () => {
      // Après une coupure, on resynchronise l'état.
      if (opened) reconnectRef.current?.();
      opened = true;
    };
    source.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as ServerEvent | { type: "ping" };
        if (event.type !== "ping") handlerRef.current(event);
      } catch {
        // Message ignoré.
      }
    };
    return () => source.close();
  }, []);
}
