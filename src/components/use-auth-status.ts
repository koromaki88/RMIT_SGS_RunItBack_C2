"use client";

import { useTideCloak } from "@tidecloak/nextjs";

export function useAuthStatus() {
  const { authenticated, isInitializing, login, logout } = useTideCloak();
  return {
    authenticated,
    providerReady: !isInitializing,
    pending: isInitializing,
    signIn: login,
    signOut: logout,
  };
}
