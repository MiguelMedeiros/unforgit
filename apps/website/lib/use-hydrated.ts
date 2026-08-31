import { useSyncExternalStore } from "react";
import {
  getClientHydrationSnapshot,
  getServerHydrationSnapshot,
} from "./hydration";

const subscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
}
