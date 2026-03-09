import { useState, useEffect, useCallback } from 'react';
import type { Role } from '@/types';
import { getAllRoles } from '@/db/roles';
import { useRolesStore } from '@/stores/roles-store';

export function useRoles(includeArchived = false) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const rolesVersion = useRolesStore((s) => s.rolesVersion);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAllRoles(includeArchived);
    setRoles(data);
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => {
    refresh();
  }, [refresh, rolesVersion]);

  return { roles, loading, refresh };
}
