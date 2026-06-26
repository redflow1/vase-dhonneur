"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

export function useApi<T>(path: string, deps: any[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiFetch(path);
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  return { data, loading, error, refetch };
}
