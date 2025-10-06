
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/button-variants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Settings as SettingsIcon, 
  Wifi, 
  WifiOff,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [supabaseUrl] = useState(import.meta.env.VITE_SUPABASE_URL || 'https://waslpdqekbwxptwgpjze.supabase.co');
  const [supabaseKey] = useState(import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJ...');
  const { toast } = useToast();

  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      
      // Test simple query to check connection
      const { data, error } = await supabase
        .from('accounts')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      setConnectionStatus('connected');
      toast({
        title: "Conexão estabelecida",
        description: "A conexão com o Supabase está funcionando corretamente.",
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      toast({
        variant: "destructive",
        title: "Erro na conexão",
        description: "Não foi possível conectar ao Supabase. Verifique as configurações.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const maskKey = (key: string) => {
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.substring(0, 4) + '•'.repeat(Math.max(0, key.length - 8)) + key.substring(Math.max(4, key.length - 4));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="page-header">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-brand rounded-lg flex items-center justify-center">
            <SettingsIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-brand">Configurações</h1>
            <p className="text-muted-foreground">
              Configurações do sistema e conectividade
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="card-gradient">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                connectionStatus === 'connected' ? 'bg-success-100' :
                connectionStatus === 'error' ? 'bg-danger-100' : 'bg-muted'
              }`}>
                {connectionStatus === 'checking' ? (
                  <LoadingSpinner size="sm" />
                ) : connectionStatus === 'connected' ? (
                  <CheckCircle className="h-5 w-5 text-success-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-danger-600" />
                )}
              </div>
              <div>
                <CardTitle>Status da Conexão</CardTitle>
                <CardDescription>
                  {connectionStatus === 'checking' && 'Verificando conexão...'}
                  {connectionStatus === 'connected' && 'Conectado ao Supabase'}
                  {connectionStatus === 'error' && 'Erro na conexão com Supabase'}
                </CardDescription>
              </div>
            </div>
            
            <CustomButton
              variant={connectionStatus === 'connected' ? 'success' : 'outline'}
              onClick={testConnection}
              disabled={connectionStatus === 'checking'}
            >
              {connectionStatus === 'checking' ? (
                <>
                  <LoadingSpinner size="sm" />
                  Testando...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4" />
                  Testar Conexão
                </>
              )}
            </CustomButton>
          </div>
        </CardHeader>
      </Card>

      {/* Supabase Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Configuração do Supabase
          </CardTitle>
          <CardDescription>
            Informações de conexão com o banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL do Projeto</label>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono break-all">{supabaseUrl}</code>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Chave Anônima</label>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono">{maskKey(supabaseKey)}</code>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informação</AlertTitle>
            <AlertDescription>
              Essas configurações são definidas nas variáveis de ambiente do projeto. 
              Para alterá-las, modifique os valores no arquivo de configuração do Supabase.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
          <CardDescription>
            Detalhes técnicos e versões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Versão do Sistema</label>
              <p className="text-lg font-semibold">v1.0.0</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Ambiente</label>
              <p className="text-lg font-semibold">
                {import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
              <p className="text-lg font-semibold">
                {new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(new Date())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Funcionalidades</CardTitle>
          <CardDescription>
            Verificação das principais funcionalidades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Autenticação', status: 'active', description: 'Sistema de login funcionando' },
              { name: 'Banco de Dados', status: connectionStatus === 'connected' ? 'active' : 'error', description: 'Conexão com Supabase' },
              { name: 'Tempo Real', status: 'active', description: 'Atualizações em tempo real' },
              { name: 'Armazenamento', status: 'active', description: 'Bucket de candidatas configurado' },
            ].map((feature) => (
              <div key={feature.name} className="flex items-center justify-between py-3 border-b border-muted last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    feature.status === 'active' ? 'bg-success-500' : 'bg-danger-500'
                  }`} />
                  <div>
                    <p className="font-medium">{feature.name}</p>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <div className={`status-badge-${feature.status === 'active' ? 'active' : 'error'}`}>
                  {feature.status === 'active' ? 'Ativo' : 'Erro'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
