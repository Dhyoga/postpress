"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

export function useApi<T>(input: RequestInfo | URL, init?: RequestInit): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const [inputKey, setInputKey] = useState(0);

  const refetch = useCallback(() => setInputKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(input, init)
      .then(async (res) => {
        const text = await res.text();
        let json: T | null = null;
        try {
          json = text ? (JSON.parse(text) as T) : null;
        } catch {
          json = null;
        }
        if (!res.ok) {
          const message = (json as { error?: string } | null)?.error || text || `HTTP ${res.status}`;
          if (!cancelled) setState({ data: null, loading: false, error: String(message) });
          return;
        }
        if (!cancelled) setState({ data: json, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [String(input), JSON.stringify(init), inputKey]);

  return { ...state, refetch };
}

export function usePostMutation<TBody, TResponse>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (url: string, body: TBody): Promise<TResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json: TResponse | null = null;
      try {
        json = text ? (JSON.parse(text) as TResponse) : null;
      } catch {
        json = null;
      }
      if (!res.ok) {
        const message = (json as { error?: string } | null)?.error || text || `HTTP ${res.status}`;
        setError(String(message));
        return null;
      }
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
}
