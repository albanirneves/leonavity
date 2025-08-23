import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomButton } from '@/components/ui/button-variants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Eye, EyeOff, Mail, Lock, ArrowRight, UserPlus, KeyRound, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();

  const urlParams = new URLSearchParams(location.search);
  const isRecovery = urlParams.get('type') === 'recovery';

  type Mode = 'login' | 'signup' | 'reset' | 'update';
  const [mode, setMode] = useState<Mode>(isRecovery ? 'update' : 'login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // SEO
    document.title = 'Autenticação | Leona Vity Eventos';
    const canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    const href = window.location.origin + '/auth';
    if (canonical) canonical.href = href; else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (isRecovery) setMode('update');
  }, [isRecovery]);

  // Redirect if already authenticated
  if (user && !authLoading && mode !== 'update') {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === 'login') {
        if (!email || !password) {
          toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Informe email e senha.' });
          return;
        }
        await signIn(email, password);
      }

      if (mode === 'signup') {
        if (!email || !password) {
          toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Informe email e senha.' });
          return;
        }
        if (password !== confirmPassword) {
          toast({ variant: 'destructive', title: 'Senhas não conferem', description: 'Digite a mesma senha nos dois campos.' });
          return;
        }
        await signUp(email, password);
      }

      if (mode === 'reset') {
        if (!email) {
          toast({ variant: 'destructive', title: 'Informe seu email', description: 'Precisamos do email para recuperar.' });
          return;
        }
        await resetPassword(email);
        setMode('login');
        setEmail('');
      }

      if (mode === 'update') {
        if (!password || !confirmPassword) {
          toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha a nova senha.' });
          return;
        }
        if (password !== confirmPassword) {
          toast({ variant: 'destructive', title: 'Senhas não conferem', description: 'Digite a mesma senha nos dois campos.' });
          return;
        }
        await updatePassword(password);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const Title = useMemo(() => {
    switch (mode) {
      case 'signup': return 'Criar conta';
      case 'reset': return 'Recuperar senha';
      case 'update': return 'Definir nova senha';
      default: return 'Fazer login';
    }
  }, [mode]);

  const Description = useMemo(() => {
    switch (mode) {
      case 'signup': return 'Cadastre-se para acessar o sistema';
      case 'reset': return 'Digite seu email para receber as instruções';
      case 'update': return 'Escolha sua nova senha para continuar';
      default: return 'Entre com seu email e senha';
    }
  }, [mode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <main className="w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-brand rounded-2xl flex items-center justify-center mb-4" aria-hidden>
            <span className="text-2xl font-bold text-white">LV</span>
          </div>
          <h1 className="text-3xl font-bold text-gradient-brand">Autenticação</h1>
          <p className="text-muted-foreground">{Description}</p>
        </header>

        <Card className="card-gradient shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">{Title}</CardTitle>
            <CardDescription>{Description}</CardDescription>
          </CardHeader>
          <CardContent>
            {authLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
                  <div className="form-group">
                    <Label htmlFor="email" className="form-label">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 focus-ring"
                        disabled={isLoading}
                        required={mode !== 'reset' ? true : false}
                      />
                    </div>
                  </div>
                )}

                {(mode === 'login' || mode === 'signup' || mode === 'update') && (
                  <div className="form-group">
                    <Label htmlFor="password" className="form-label">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 focus-ring"
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isLoading}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {(mode === 'signup' || mode === 'update') && (
                  <div className="form-group">
                    <Label htmlFor="confirm" className="form-label">Confirmar senha</Label>
                    <Input
                      id="confirm"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="focus-ring"
                      disabled={isLoading}
                      required
                    />
                  </div>
                )}

                <CustomButton type="submit" variant="brand" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" variant="white" />
                      {mode === 'login' && 'Entrando...'}
                      {mode === 'signup' && 'Criando conta...'}
                      {mode === 'reset' && 'Enviando...'}
                      {mode === 'update' && 'Atualizando...'}
                    </>
                  ) : (
                    <>
                      {mode === 'login' && <><span>Entrar</span><ArrowRight className="h-4 w-4" /></>}
                      {mode === 'signup' && <><span>Criar conta</span><UserPlus className="h-4 w-4" /></>}
                      {mode === 'reset' && <><span>Enviar instruções</span><Mail className="h-4 w-4" /></>}
                      {mode === 'update' && <><span>Salvar nova senha</span><Check className="h-4 w-4" /></>}
                    </>
                  )}
                </CustomButton>

                <div className="text-center space-x-3">
                  {mode !== 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      disabled={isLoading}
                    >
                      Já tenho conta
                    </button>
                  )}
                  {mode !== 'signup' && !isRecovery && (
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      disabled={isLoading}
                    >
                      Criar conta
                    </button>
                  )}
                  {mode !== 'reset' && !isRecovery && (
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      disabled={isLoading}
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <footer className="text-center text-sm text-muted-foreground">
          <p>Sistema administrativo para gerenciamento de eventos</p>
          <p className="mt-1">© 2025 Leona Vity Eventos</p>
        </footer>
      </main>
    </div>
  );
}
