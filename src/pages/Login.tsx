
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  const { user, signIn, resetPassword, loading: authLoading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  // Redirect if already authenticated
  if (user && !authLoading) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || (!password && !isResetMode)) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isResetMode) {
        await resetPassword(email);
        setIsResetMode(false);
        setEmail('');
      } else {
        const { error } = await signIn(email, password);
        if (!error) {
          // Redirect will be handled by the auth context
          console.log('Login successful, redirect will be handled by auth context');
        }
      }
    } catch (error) {
      console.error('Login form error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gradient-brand">
            Votação Online via WhatsApp
          </h1>
          <p className="text-muted-foreground">
            {isResetMode ? 'Recuperar senha' : 'Acesse o painel administrativo'}
          </p>
        </div>

        {/* Login Form */}
        <Card className="card-gradient shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {isResetMode ? 'Recuperar senha' : 'Fazer login'}
            </CardTitle>
            <CardDescription>
              {isResetMode 
                ? 'Digite seu email para receber as instruções de recuperação'
                : 'Digite suas credenciais para acessar o sistema'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="form-group">
                <Label htmlFor="email" className="form-label">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 focus-ring"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              {!isResetMode && (
                <div className="form-group">
                  <Label htmlFor="password" className="form-label">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
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
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <CustomButton
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" />
                    {isResetMode ? 'Enviando...' : 'Entrando...'}
                  </>
                ) : (
                  <>
                    {isResetMode ? 'Enviar instruções' : 'Entrar'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </CustomButton>

              {/* Toggle Reset Mode */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(!isResetMode);
                    setPassword('');
                  }}
                  className="text-sm text-primary hover:text-primary/90 underline-offset-4 hover:underline transition-colors"
                  disabled={isLoading}
                >
                  {isResetMode ? 'Voltar ao login' : 'Esqueci minha senha'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Sistema administrativo para gerenciamento de eventos</p>
          <p className="mt-1">© 2025 Votação Online via WhatsApp</p>
        </div>
      </div>
    </div>
  );
}
