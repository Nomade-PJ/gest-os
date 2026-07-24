/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
const CompanyContext = createContext(undefined);
export const CompanyProvider = ({
  children
}) => {
  const {
    user
  } = useAuth();
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshTimeout, setRefreshTimeout] = useState(null);
  const fetchCompanyInfo = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      setIsInitialized(true);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const {
        data,
        error: fetchError
      } = await supabase.from('profiles').select('company_name, document, document_type, phone, cep, state, city, neighborhood, street, number, complement').eq('id', user.id).maybeSingle();
      if (fetchError) {
        console.error('Erro ao buscar informações da empresa:', fetchError);
        setError('Erro ao buscar informações da empresa');
        return;
      }
      if (data) {
        const newCompanyInfo = {
          companyName: data.company_name,
          document: data.document,
          documentType: data.document_type,
          phone: data.phone,
          address: {
            street: data.street,
            number: data.number,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            cep: data.cep,
            complement: data.complement
          }
        };
        setCompanyInfo(newCompanyInfo);
      } else {
        setCompanyInfo(null);
      }
    } catch (error) {
      console.error('Erro ao carregar informações da empresa:', error);
      setError('Erro ao carregar informações da empresa');
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, [user?.id]);
  const refreshCompanyInfo = useCallback(async () => {
    // Debounce para evitar múltiplas chamadas
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    const timeout = setTimeout(async () => {
      setIsInitialized(false); // Reset initialization flag to force refetch
      await fetchCompanyInfo();
    }, 300);
    setRefreshTimeout(timeout);
  }, [refreshTimeout, fetchCompanyInfo]);
  useEffect(() => {
    if (user?.id && !isInitialized) {
      fetchCompanyInfo();
    }
  }, [user?.id, isInitialized, fetchCompanyInfo]);

  // Escutar mudanças em tempo real na tabela profiles (apenas se inicializado)
  useEffect(() => {
    if (!user?.id || !isInitialized) return;
    const channelName = `profiles_changes_${user.id}`;
    const channel = supabase.channel(channelName).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${user.id}`
    }, () => {
      // Atualizar as informações quando houver mudanças (com debounce)
      refreshCompanyInfo();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [user?.id, isInitialized, refreshCompanyInfo, refreshTimeout]);
  return <CompanyContext.Provider value={{
    companyInfo,
    loading,
    error,
    refreshCompanyInfo
  }}>
      {children}
    </CompanyContext.Provider>;
};
export const useCompanyInfo = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyInfo deve ser usado dentro de um CompanyProvider');
  }
  return context;
};
