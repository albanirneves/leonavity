import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RefreshCw,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: number;
  name: string;
  start_vote: string;
}

interface DashboardStats {
  votesActive: number;
  grossRevenue: number;
  netRevenue: number;
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
  totalCandidates: number;
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats>({
    votesActive: 0,
    grossRevenue: 0,
    netRevenue: 0,
    topCandidates: [],
    recentPayments: [],
    totalCandidates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  const activeTab = searchParams.get('tab') || 'overview';

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_vote')
        .order('start_vote', { ascending: false });
      
      if (error) throw error;
      
      setEvents(data || []);
      // Auto-select the first event if none is selected
      if (data && data.length > 0 && !selectedEvent) {
        setSelectedEvent(data[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar eventos",
        description: "Não foi possível carregar a lista de eventos.",
      });
    }
  };

  const fetchDashboardData = async () => {
    if (!selectedEvent) return;
    
    try {
      setLoading(true);
      const eventId = parseInt(selectedEvent);
      
      // 1. Buscar votos ativos (approved) do evento selecionado
      const { data: activeVotes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('id_event', eventId)
        .eq('payment_status', 'approved');

      if (votesError) throw votesError;

      const votesActiveCount = activeVotes?.length || 0;

      // 2. Buscar dados do evento para calcular faturamento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('vote_value, card_tax, pix_tax')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // 3. Calcular faturamento bruto e líquido
      let grossRevenue = 0;
      let netRevenue = 0;

      if (activeVotes && eventData) {
        activeVotes.forEach(vote => {
          const voteValue = Number(eventData.vote_value);
          const votes = Number(vote.votes) || 0;
          const baseAmount = voteValue * votes;
          
          grossRevenue += baseAmount;
          
          // Calcular líquido baseado no método de pagamento
          if (vote.changed_to_card) {
            const cardTax = Number(eventData.card_tax) || 0;
            netRevenue += baseAmount * (100 - cardTax) / 100;
          } else {
            const pixTax = Number(eventData.pix_tax) || 0;
            netRevenue += baseAmount * (100 - pixTax) / 100;
          }
        });
      }

      // 4. Buscar top candidatas do evento
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id_event', eventId);

      if (candidatesError) throw candidatesError;

      // Calcular votos por candidata
      const candidatesWithVotes = await Promise.all(
        (candidatesData || []).map(async (candidate) => {
          const { data: votesData } = await supabase
            .from('votes')
            .select('votes')
            .eq('id_event', candidate.id_event)
            .eq('id_category', candidate.id_category)
            .eq('id_candidate', candidate.id_candidate)
            .eq('payment_status', 'approved');

          const totalVotes = votesData?.reduce((sum, vote) => sum + (Number(vote.votes) || 0), 0) || 0;

          return {
            name: candidate.name,
            votes: totalVotes,
            event: 'Evento Atual',
            category: `Categoria ${candidate.id_category}`
          };
        })
      );

      // Ordenar por votos e pegar top 5
      const topCandidates = candidatesWithVotes
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5);

      // 5. Buscar pagamentos recentes do evento
      const { data: recentPayments } = await supabase
        .from('votes')
        .select('id, payment_id, payment_status, payment_status_detail, created_at, votes')
        .eq('id_event', eventId)
        .not('payment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // 6. Buscar total de candidatas do evento
      const totalCandidates = candidatesData?.length || 0;

      setStats({
        votesActive: votesActiveCount,
        grossRevenue,
        netRevenue,
        topCandidates,
        recentPayments: recentPayments?.map(payment => ({
          ...payment,
          id: payment.id.toString()
        })) || [],
        totalCandidates,
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
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchDashboardData();
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) return;

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
  }, [selectedEvent, toast]);

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
      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-80 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
        <div className="h-12 bg-muted animate-pulse rounded"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-96 bg-muted animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6 animate-fade-in">
      {/* Event Selection */}
      <div className="flex items-center gap-4 bg-card p-3 rounded-lg border">
        <Search className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Selecione um evento para visualizar" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Metrics Cards */}
      {selectedEvent && (
        <div className="metrics-grid">
          <Card className="metric-card-success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium text-white/90">
                Votos Ativos
              </CardTitle>
              <Activity className="h-4 w-4 text-white/80" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold text-white">{stats.votesActive}</div>
              <p className="text-xs text-white/70">
                Votos aprovados no evento
              </p>
            </CardContent>
          </Card>

          <Card className="metric-card-warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium text-white/90">
                Faturamento Bruto
              </CardTitle>
              <DollarSign className="h-4 w-4 text-white/80" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(stats.grossRevenue)}
              </div>
              <p className="text-xs text-white/70">
                Receita total sem descontos
              </p>
            </CardContent>
          </Card>

          <Card className="metric-card-brand">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium text-white/90">
                Faturamento Líquido
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-white/80" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(stats.netRevenue)}
              </div>
              <p className="text-xs text-white/70">
                Receita após taxas
              </p>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium">
                Candidatas
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold">{stats.totalCandidates}</div>
              <p className="text-xs text-muted-foreground">
                Cadastradas no evento
              </p>
            </CardContent>
          </Card>
        </div>
      )}

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
