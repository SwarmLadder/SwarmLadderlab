"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function Personal({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return ready ? children : <p role="status">Loading learning workspace…</p>;
}
