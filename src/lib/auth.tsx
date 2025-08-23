import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>; 
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Cleanup helper to avoid limbo states
const cleanupAuthState = () => {
  try {
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {}
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_IN') {
        toast({ title: 'Login realizado', description: `Bem-vindo(a), ${session?.user?.email}` });
      }
      if (event === 'SIGNED_OUT') {
        toast({ title: 'Sessão encerrada', description: 'Você saiu da aplicação.' });
      }
    });

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('Error getting session:', error);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' as any }); } catch {}

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        let errorMessage = 'Erro ao fazer login';
        if (error.message.includes('Invalid login credentials')) errorMessage = 'Email ou senha incorretos';
        if (error.message.includes('Email not confirmed')) errorMessage = 'Confirme seu email para entrar';
        toast({ variant: 'destructive', title: 'Erro no login', description: errorMessage });
      } else {
        // Full refresh avoids limbo
        window.location.href = '/';
      }
      return { error };
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Tente novamente.' });
      return { error } as any;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' as any }); } catch {}

      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl }
      });

      if (error) {
        let msg = 'Erro ao criar conta';
        if (error.message.includes('User already registered')) msg = 'Este email já está cadastrado';
        toast({ variant: 'destructive', title: 'Falha no cadastro', description: msg });
      } else {
        toast({ title: 'Cadastro iniciado', description: 'Verifique seu email para confirmar a conta.' });
      }
      return { error };
    } catch (error) {
      console.error('Unexpected signup error:', error);
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Tente novamente.' });
      return { error } as any;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao atualizar senha', description: 'Tente novamente.' });
      } else {
        toast({ title: 'Senha atualizada', description: 'Sua senha foi alterada com sucesso.' });
        window.location.href = '/';
      }
      return { error };
    } catch (error) {
      console.error('Unexpected update password error:', error);
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Tente novamente.' });
      return { error } as any;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      if (error) {
        let msg = 'Erro ao enviar email de recuperação';
        if (error.message.includes('User not found')) msg = 'Email não encontrado';
        toast({ variant: 'destructive', title: 'Falha na recuperação', description: msg });
      } else {
        toast({ title: 'Email enviado', description: 'Verifique sua caixa de entrada.' });
      }
      return { error };
    } catch (error) {
      console.error('Unexpected password reset error:', error);
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Tente novamente.' });
      return { error } as any;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' as any }); } catch {}
    } finally {
      setLoading(false);
      window.location.href = '/auth';
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    updatePassword,
    resetPassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
