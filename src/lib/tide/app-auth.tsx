"use client";
import { createContext, useContext } from "react";
export type AppAuth = {
  authenticated: boolean; providerReady: boolean; pending: boolean;
  signIn: () => Promise<void>; signOut: () => Promise<void>;
};
export const AppAuthContext = createContext<AppAuth | null>(null);
export function useAppAuth() {
  const value = useContext(AppAuthContext);
  if (!value) throw new Error("Application auth provider missing");
  return value;
}
