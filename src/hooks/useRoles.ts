import { useState, useEffect, useCallback } from 'react';
import type { Role } from '@/types';
import { getAllRoles } from '@/db/roles';

export function useRoles(includeArchived = false) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllRoles(includeArchived);
    setRoles(data);
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { roles, loading, refresh };
}
