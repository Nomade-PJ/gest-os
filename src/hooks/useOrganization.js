import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
export function useOrganization() {
  const {
    user,
    isAuthenticated,
    profile
  } = useAuth();
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    async function getOrganizationId() {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }
      try {
        // Se o profile já tiver o organization_id, usamos ele diretamente
        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id);
          setLoading(false);
          return;
        }

        // Caso contrário, buscamos no banco de dados
        const {
          data,
          error
        } = await supabase.from('profiles').select('organization_id').eq('id', user.id).maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        setOrganizationId(data?.organization_id || null);
      } catch (err) {
        console.error('Erro ao buscar organização:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }
    getOrganizationId();
  }, [user, isAuthenticated, profile]);
  return {
    organizationId,
    loading,
    error
  };
}
