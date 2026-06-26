"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser, clearAuth, AuthUser } from "@/lib/auth";

interface UseAuthResult {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => void;
}

export function useAuth(): UseAuthResult {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) {
      router.replace("/login");
    } else {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, [router]);

  const logout = () => {
    clearAuth();
    setUser(null);
    router.replace("/login");
  };

  return { user, isLoading, logout };
}
