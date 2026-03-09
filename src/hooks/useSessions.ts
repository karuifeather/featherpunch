import { useState, useEffect, useCallback } from 'react';
import type { SessionWithRole } from '@/types';
import { getRecentSessions, getTodaySessions, getSessionsByDateRange } from '@/db/sessions';

export function useRecentSessions(limit = 100) {
  const [sessions, setSessions] = useState<SessionWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getRecentSessions(limit);
    setSessions(data);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}

export function useTodaySessions() {
  const [sessions, setSessions] = useState<SessionWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getTodaySessions();
    setSessions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}

export function useSessionsByDateRange(startDate: string, endDate: string) {
  const [sessions, setSessions] = useState<SessionWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getSessionsByDateRange(startDate, endDate);
    setSessions(data);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}
