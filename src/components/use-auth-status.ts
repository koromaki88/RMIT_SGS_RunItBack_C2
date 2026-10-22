"use client";

import { useAppAuth } from "../lib/tide/app-auth";

export function useAuthStatus() {
  return useAppAuth();
}
