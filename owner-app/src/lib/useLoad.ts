import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { onDataChange } from "./api";

/**
 * Loads data, and reloads it whenever the screen comes back into focus or
 * anything is changed anywhere in the app (or a client books online).
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    try {
      setData(await fnRef.current());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), deps);
  useFocusEffect(useCallback(() => void load(), [load]));
  useEffect(() => {
    const off = onDataChange(() => void load());
    return () => {
      off();
    };
  }, [load]);

  const reload = useCallback(() => load(true), [load]); // pull-to-refresh (shows the spinner)
  const refresh = useCallback(() => load(), [load]); // quiet background refresh

  return { data, error, refreshing, reload, refresh, loading: data === null && !error };
}
