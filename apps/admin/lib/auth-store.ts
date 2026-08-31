import { useSyncExternalStore } from "react";
import { getAdminAuthState, type AdminAuthState } from "./auth-state";

const subscribeToStorage = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
};

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const getServerStorageSnapshot = () => null;
const getTokenSnapshot = () =>
  typeof window === "undefined" ? null : localStorage.getItem("admin_token");
const getUserSnapshot = () =>
  typeof window === "undefined" ? null : localStorage.getItem("user");

export function useAdminAuthState(): AdminAuthState {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const token = useSyncExternalStore(
    subscribeToStorage,
    getTokenSnapshot,
    getServerStorageSnapshot,
  );
  const userJson = useSyncExternalStore(
    subscribeToStorage,
    getUserSnapshot,
    getServerStorageSnapshot,
  );

  return getAdminAuthState(hydrated, token, userJson);
}
