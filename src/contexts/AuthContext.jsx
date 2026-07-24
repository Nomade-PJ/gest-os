/* eslint-disable react-refresh/only-export-components */
import React, { createContext, ReactNode, useState, useEffect, useContext, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
const AuthContext = createContext(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export const AuthProvider = ({
  children
}) => {
  const [authState, setAuthState] = useState({
    session: null,
    user: null,
    profile: null,
    isAuthenticated: false,
    isLoading: true
  });
  const userRef = useRef(null);
  userRef.current = authState.user;
  const navigate = useNavigate();
  const fetchUserProfile = async userId => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };
  const refreshProfile = async () => {
    if (!authState.user) return;
    try {
      const profileData = await fetchUserProfile(authState.user.id);
      if (profileData) {
        setAuthState(prev => ({
          ...prev,
          profile: profileData
        }));
      }
    } catch (error) {
      console.error("Error refreshing user profile:", error);
    }
  };
  useEffect(() => {
    // Evita que o listener onAuthStateChange derrube a sessão antes da
    // checagem inicial (getSession) terminar de restaurar a sessão salva.
    // Sem essa guarda, um refresh de página (F5) podia cair numa corrida
    // em que o evento inicial do listener chegava com sessão nula antes
    // da sessão salva ser restaurada, jogando o usuário pro /login mesmo
    // estando autenticado.
    let initialCheckDone = false;

    // Função para inicializar a autenticação
    const initializeAuth = async () => {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();

        // Primeiro atualizamos o estado com a sessão atual
        if (session) {
          setAuthState(prev => ({
            ...prev,
            session,
            user: session?.user || null,
            isAuthenticated: true
          }));

          // Buscamos o perfil do usuário após confirmar a sessão
          const profileData = await fetchUserProfile(session.user.id);
          setAuthState(prev => ({
            ...prev,
            profile: profileData || {
              id: session.user.id,
              email: session.user.email
            },
            isLoading: false
          }));
        } else {
          // Se não houver sessão, garantimos que isLoading seja false
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: false
          }));
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false
        }));
      } finally {
        initialCheckDone = true;
      }
    };

    // Configurar listener para mudanças no estado de autenticação
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignora o(s) evento(s) que o próprio Supabase dispara automaticamente
      // ao registrar o listener, enquanto a checagem inicial (initializeAuth)
      // ainda não terminou de restaurar a sessão salva. Depois que a checagem
      // inicial termina, todo evento passa a ser tratado normalmente
      // (login, logout, refresh de token, etc.).
      if (!initialCheckDone) {
        return;
      }

      // Atualizar estado de forma síncrona
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user || null,
        isAuthenticated: !!session
      }));

      // Usar setTimeout para evitar deadlocks ao buscar o perfil do usuário
      if (session?.user) {
        setTimeout(async () => {
          const profileData = await fetchUserProfile(session.user.id);
          setAuthState(prev => ({
            ...prev,
            profile: profileData || {
              id: session.user.id,
              email: session.user.email
            },
            isLoading: false
          }));
        }, 0);
      } else {
        setAuthState(prev => ({
          ...prev,
          profile: null,
          isLoading: false,
          isAuthenticated: false
        }));
      }
    });

    // Inicializar auth após configurar o listener
    initializeAuth();

    // Configurar subscription para mudanças no perfil
    const profileSubscription = supabase.channel('public:profiles').on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles'
    }, async payload => {
      const updatedProfile = payload.new;
      const currentUser = userRef.current;
      if (currentUser && updatedProfile.id === currentUser.id) {
        setAuthState(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            ...updatedProfile
          }
        }));
      }
    }).subscribe();

    // Cleanup das subscriptions
    return () => {
      subscription.unsubscribe();
      profileSubscription.unsubscribe();
    };
  }, []);
  const login = async (email, password) => {
    try {
      setAuthState(prev => ({
        ...prev,
        isLoading: true
      }));
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      // Update authenticated state
      setAuthState(prev => ({
        ...prev,
        session: data.session,
        user: data.user,
        isAuthenticated: true
      }));

      // Super admin vai para o painel administrativo; usuário comum vai
      // para o dashboard normal do sistema.
      try {
        const { data: isAdmin } = await supabase.rpc('is_super_admin');
        navigate(isAdmin ? '/admin' : '/dashboard');
      } catch (adminCheckError) {
        console.error('Erro ao verificar permissão de admin:', adminCheckError);
        navigate('/dashboard');
      }
      toast.success("Login bem-sucedido!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Error logging in:", errorMessage);
      toast.error(errorMessage || "Erro ao fazer login");
      return Promise.reject(error);
    } finally {
      setAuthState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  };
  const loginWithGoogle = async () => {
    try {
      const {
        error
      } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro de autenticação com Google:", error);
      toast.error("Falha no login com Google: " + errorMessage);
      throw error;
    }
  };
  const signup = async (companyName, email, password, phone) => {
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            company_name: companyName
          }
        }
      });
      if (error) throw error;

      // Criar perfil para o usuário se o cadastro foi bem-sucedido
      if (data?.user) {
        const {
          error: profileError
        } = await supabase.from('profiles').upsert({
          id: data.user.id,
          name: companyName,
          company_name: companyName,
          email: email,
          phone: phone,
          role: 'Usuário',
          registration_step: 1,
          // Cadastro básico completo
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
        }
      }
      toast.success("Cadastro realizado! Verifique seu e-mail para confirmar.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro no cadastro:", error);
      toast.error("Falha no cadastro: " + errorMessage);
      throw error;
    }
  };
  const sendPasswordResetEmail = async email => {
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (error) throw error;
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao enviar e-mail de recuperação:", error);
      toast.error("Erro ao enviar e-mail de recuperação: " + errorMessage);
      throw error;
    }
  };
  const sendMagicLink = async email => {
    try {
      const {
        error
      } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/magic-link##`
        }
      });
      if (error) throw error;
      toast.success("Link mágico enviado! Verifique seu e-mail.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao enviar link mágico:", error);
      toast.error("Erro ao enviar link mágico: " + errorMessage);
      throw error;
    }
  };
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao fazer logout:", error);
      toast.error("Falha ao fazer logout: " + errorMessage);
      throw error;
    }
  };
  const contextValue = {
    ...authState,
    login,
    loginWithGoogle,
    signup,
    logout,
    refreshProfile,
    sendPasswordResetEmail,
    sendMagicLink
  };
  return <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>;
};
