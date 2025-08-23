import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomButton } from '@/components/ui/button-variants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  BarChart3, 
  TrendingUp, 
  Vote, 
  DollarSign, 
  Users, 
  Calendar,
  Trophy,
  Activity,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  votesToday: number;
  votesActive: number;
  estimatedRevenue: number;
  topCandidates: Array<{
    name: string;
    votes: number;
    event: string;
    category: string;
  }>;
  recentPayments: Array<{
    id: string;
    payment_id: string;
    payment_status: string;
    payment_status_detail: string;
    created_at: string;
    votes: number;
  }>;
  activeEvents: number;
  totalCandidates: number;
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState<DashboardStats>({
    votesToday: 0,
    votesActive: 0,
    estimatedRevenue: 0,
    topCandidates: [],
    recentPayments: [],
    activeEvents: 0,
    totalCandidates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  const activeTab = searchParams.get('tab') || 'overview';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Buscar votos de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: votesToday } = await supabase
        .from('votes')
        .select('id')
        .gte('created_at', today.toISOString());

      // Buscar eventos ativos
      const now = new Date().toISOString();
      const { data: activeEvents } = await supabase
        .from('events')
        .select('id, vote_value')
        .eq('active', true)
        .lte('start_vote', now)
        .gte('end_vote', now);

      // Buscar votos no período ativo
      const { data: votesActive } = await supabase
        .from('votes')
        .select('votes, id_event')
        .in('id_event', activeEvents?.map(e => e.id) || []);

      // Buscar faturamento estimado (votos aprovados)
      const { data: approvedVotes } = await supabase
        .from('votes')
        .select('votes, id_event')
        .eq('payment_status', 'approved');

      // Calcular faturamento
      let estimatedRevenue = 0;
      if (approvedVotes && activeEvents) {
        approvedVotes.forEach(vote => {
          const event = activeEvents.find(e => e.id === vote.id_event);
          if (event && vote.votes) {
            estimatedRevenue += Number(vote.votes) * Number(event.vote_value);
          }
        });
      }

      // Buscar top candidatas (mock data por enquanto)
      const topCandidates = [
        { name: "Ana Silva", votes: 245, event: "Miss 2024", category: "Geral" },
        { name: "Maria Santos", votes: 198, event: "Miss 2024", category: "Geral" },
        { name: "Julia Costa", votes: 167, event: "Miss 2024", category: "Geral" },
      ];

      // Buscar pagamentos recentes
      const { data: recentPayments } = await supabase
        .from('votes')
        .select('id, payment_id, payment_status, payment_status_detail, created_at, votes')
        .not('payment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // Buscar total de candidatas
      const { data: totalCandidates } = await supabase
        .from('candidates')
        .select('id');

      setStats({
        votesToday: votesToday?.length || 0,
        votesActive: votesActive?.reduce((sum, v) => sum + (Number(v.votes) || 0), 0) || 0,
        estimatedRevenue,
        topCandidates,
        recentPayments: recentPayments?.map(payment => ({
          ...payment,
          id: payment.id.toString()
        })) || [],
        activeEvents: activeEvents?.length || 0,
        totalCandidates: totalCandidates?.length || 0,
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up realtime subscription for votes
    const channel = supabase
      .channel('dashboard-votes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes'
        },
        (payload) => {
          console.log('New vote received:', payload);
          fetchDashboardData(); // Refresh data when new vote comes in
          toast({
            title: "Novo voto recebido!",
            description: "Os dados foram atualizados automaticamente.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <div className="loading-skeleton h-8 w-48"></div>
          <div className="loading-skeleton h-4 w-64"></div>
        </div>
        <div className="metrics-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="metric-card">
              <div className="loading-skeleton h-6 w-32 mb-2"></div>
              <div className="loading-skeleton h-8 w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-brand">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral dos eventos e métricas em tempo real
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Última atualização: {formatDate(lastUpdate.toISOString())}
            </div>
            <CustomButton 
              variant="outline" 
              size="sm" 
              onClick={fetchDashboardData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </CustomButton>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <Card className="metric-card-brand">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Votos Hoje
            </CardTitle>
            <Vote className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.votesToday}</div>
            <p className="text-xs text-white/70">
              Votos recebidos nas últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Votos Ativos
            </CardTitle>
            <Activity className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.votesActive}</div>
            <p className="text-xs text-white/70">
              Em eventos em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card-warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Faturamento
            </CardTitle>
            <DollarSign className="h-4 w-4 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.estimatedRevenue)}
            </div>
            <p className="text-xs text-white/70">
              Receita estimada aprovada
            </p>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Eventos Ativos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEvents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCandidates} candidatas cadastradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="votes">Votos</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="revenue">Faturamento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Últimos Pagamentos
                </CardTitle>
                <CardDescription>
                  Transações recentes no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum pagamento encontrado
                    </div>
                  ) : (
                    stats.recentPayments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between border-b border-muted pb-2">
                        <div>
                          <p className="font-medium">{payment.payment_id || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`status-badge-${
                            payment.payment_status === 'approved' ? 'active' : 
                            payment.payment_status === 'pending' ? 'pending' : 'error'
                          }`}>
                            {payment.payment_status}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {payment.votes} votos
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Candidates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Candidatas
                </CardTitle>
                <CardDescription>
                  Ranking das candidatas mais votadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topCandidates.map((candidate, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-muted pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-brand rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {candidate.event} • {candidate.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-brand-600">{candidate.votes}</p>
                        <p className="text-xs text-muted-foreground">votos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="votes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Votos</CardTitle>
              <CardDescription>
                Detalhamento dos votos por período e status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Gráficos e análises detalhadas serão implementados aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Completo</CardTitle>
              <CardDescription>
                Ranking detalhado por evento e categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ranking detalhado será implementado aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Faturamento</CardTitle>
              <CardDescription>
                Receita detalhada por evento e período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Análise de faturamento será implementada aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
