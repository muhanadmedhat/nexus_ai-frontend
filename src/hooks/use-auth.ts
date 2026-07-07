"use client";

import { useContext } from "react";
import { AuthContext } from "@/providers/auth-provider";

export function useAuth() {
  // 🔴 TEMPORARY, OKIII?!: Mock user for UI preview (remove after Sprint 1)
  // Change "customer" to "freelancer" or "admin" to test other dashboards
  return {
    user: {
      id: "mock-id",
      firstName: "Preview",
      lastName: "User",
      email: "preview@nexus.com",
      phoneNumber: null,
      role: "customer", // ← Change this to test other roles
      photoUrl: null,
    },
    loading: false,
    refresh: async () => {},
    logout: async () => {},
  };

  // 🔵 Original code below – uncomment when you want real auth
  // const ctx = useContext(AuthContext);
  // if (!ctx) throw new Error("useAuth must be used within an AuthProvider.");
  // return ctx;
}