import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
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
    photo_url?: string;        // photo avatar for Top Candidates
  }>;
  recentPayments: Array<{
    id: string;
    phone: string;
    payment_status: string;
    payment_status_detail: string;
    created_at: string;
    votes: number;
  }>;
  totalCandidates: number;
  revenueChart: Array<{
    date: string;
    revenue: number;
  }>;
  votesChart: Array<{
    date: string;
    votes: number;
  }>;
  categoryRankings: Array<{
    categoryName: string;
    candidates: Array<{
      name: string;
      votes: number;
      photo_url?: string;
      id_candidate: number;
    }>;
  }>;
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
    revenueChart: [],
    votesChart: [],
    categoryRankings: [],
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
      
      // 1. Buscar TODOS os votos aprovados do evento (somente colunas necessárias)
      const { data: activeVotes, error: votesError } = await supabase
        .from('votes')
        .select('votes, changed_to_card')
        .eq('id_event', eventId)
        .eq('payment_status', 'approved')
        // evita o limite padrão (~1.000 linhas) do PostgREST
        .range(0, 999999);

      if (votesError) throw votesError;

      const votesActiveCount = (activeVotes ?? []).reduce((sum, v) => sum + (Number(v.votes) || 0), 0);

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
          const baseAmount = voteValue * votes; // líquido (sem taxas)

          // Líquido = sem taxas
          netRevenue += baseAmount;

          // Bruto = com taxas, variando pelo método de pagamento
          if (vote.changed_to_card) {
            const cardTax = Number(eventData.card_tax) || 0;
            grossRevenue += baseAmount * (100 + cardTax) / 100;
          } else {
            const pixTax = Number(eventData.pix_tax) || 0;
            grossRevenue += baseAmount * (100 + pixTax) / 100;
          }
        });
      }

      // 4. Buscar top candidatas do evento
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id_event', eventId);

      if (candidatesError) throw candidatesError;

      // Buscar categorias para mapear id -> nome de categoria
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id_category, name')
        .eq('id_event', eventId)
        .order('id_category', { ascending: true });
      if (categoriesError) throw categoriesError;
      const categoryNameMap = new Map<number, string>(
        (categoriesData || []).map((c) => [c.id_category, c.name])
      );

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
            category: categoryNameMap.get(candidate.id_category) || `Categoria ${candidate.id_category}`,
            photo_url: `https://waslpdqekbwxptwgpjze.supabase.co/storage/v1/object/public/candidates/event_${eventId}_category_${candidate.id_category}_candidate_${candidate.id_candidate}.jpg`,
            //category: `Categoria ${candidate.id_category}`
          };
        })
      );

      // Ordenar por votos (todas as candidatas)
      const topCandidates = candidatesWithVotes
        .sort((a, b) => b.votes - a.votes);

      // 5. Buscar pagamentos recentes do evento
      const { data: recentPayments } = await supabase
        .from('votes')
        .select('id, phone, payment_status, payment_status_detail, created_at, votes')
        .eq('id_event', eventId)
        .not('payment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      // 6. Buscar total de candidatas do evento
      const totalCandidates = candidatesData?.length || 0;

      // 7. Gerar dados para gráficos baseados nas datas do evento
      const { data: currentEventData } = await supabase
        .from('events')
        .select('start_vote, end_vote')
        .eq('id', eventId)
        .single();

      let revenueChart: Array<{date: string; revenue: number}> = [];
      let votesChart: Array<{date: string; votes: number}> = [];

      if (currentEventData && currentEventData.start_vote && currentEventData.end_vote) {
        const startDate = new Date(currentEventData.start_vote);
        const endDate = new Date(currentEventData.end_vote);
        
        // Gerar array de datas do evento
        const dates: string[] = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }

        // Buscar dados de votos aprovados agrupados por data
        const { data: dailyVotes } = await supabase
          .from('votes')
          .select('created_at, votes')
          .eq('id_event', eventId)
          .eq('payment_status', 'approved')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Processar dados para os gráficos
        revenueChart = dates.map(date => {
          const dayVotes = dailyVotes?.filter(vote => 
            vote.created_at.startsWith(date)
          ) || [];
          
          const dayRevenue = dayVotes.reduce((sum, vote) => {
            const voteValue = Number(eventData.vote_value);
            const votes = Number(vote.votes) || 0;
            return sum + (voteValue * votes);
          }, 0);

          return { date, revenue: dayRevenue };
        });

        votesChart = dates.map(date => {
          const dayVotes = dailyVotes?.filter(vote => 
            vote.created_at.startsWith(date)
          ) || [];
          
          const totalVotes = dayVotes.reduce((sum, vote) => 
            sum + (Number(vote.votes) || 0), 0
          );

          return { date, votes: totalVotes };
        });
      }

      const categoryRankings = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { data: categoryCandiates } = await supabase
            .from('candidates')
            .select('id_candidate, name')
            .eq('id_event', eventId)
            .eq('id_category', category.id_category);

          const candidatesWithVotes = await Promise.all(
            (categoryCandiates || []).map(async (candidate) => {
              const { data: votesData } = await supabase
                .from('votes')
                .select('votes')
                .eq('id_event', eventId)
                .eq('id_category', category.id_category)
                .eq('id_candidate', candidate.id_candidate)
                .eq('payment_status', 'approved');

              const totalVotes = votesData?.reduce((sum, vote) => sum + (Number(vote.votes) || 0), 0) || 0;

              // Generate photo URL from storage with correct format
              const photo_url = `https://waslpdqekbwxptwgpjze.supabase.co/storage/v1/object/public/candidates/event_${eventId}_category_${category.id_category}_candidate_${candidate.id_candidate}.jpg`;

              return {
                name: candidate.name,
                votes: totalVotes,
                photo_url,
                id_candidate: candidate.id_candidate
              };
            })
          );

          // Sort by votes and take top 5
          const topCandidates = candidatesWithVotes
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 5);

          return {
            categoryName: category.name,
            candidates: topCandidates
          };
        })
      );

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
        revenueChart,
        votesChart,
        categoryRankings: categoryRankings.filter(cat => cat.candidates.length > 0),
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

          <Card className="metric-card-pink">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-sm font-medium text-white/90">
                Taxas
              </CardTitle>
              <DollarSign className="h-4 w-4 text-white/80" />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(stats.grossRevenue - stats.netRevenue)}
              </div>
              <p className="text-xs text-white/70">
                Diferença entre bruto e líquido
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

      {/* Content */}
      {selectedEvent && (
        <div className="space-y-6">
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
                          <p className="font-medium">{payment.phone}</p>
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
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Candidatas
                </CardTitle>
                <CardDescription>
                  Ranking das candidatas mais votadas
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full overflow-y-auto px-6 pb-6">
                  <div className="space-y-3">
                    {stats.topCandidates.map((candidate, index) => (
                      <div key={index} className="flex items-center justify-between border-b border-muted pb-2">
                        <div className="flex items-center gap-3">
                          {/* Número da posição */}
                          <div className="w-6 h-6 bg-gradient-brand rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {index + 1}
                          </div>
                          {/* Avatar da candidata */}
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={candidate.photo_url || '/placeholder.svg'}
                              alt={candidate.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Faturamento por Dia
                </CardTitle>
                <CardDescription>
                  Receita diária durante o período do evento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                        formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Votes Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5" />
                  Votos por Dia
                </CardTitle>
                <CardDescription>
                  Total de votos aprovados por dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.votesChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                        formatter={(value) => [value, 'Votos']}
                      />
                      <Bar 
                        dataKey="votes" 
                        fill="hsl(var(--success))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Rankings */}
          {stats.categoryRankings.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Ranking por Categoria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {stats.categoryRankings.map((category, categoryIndex) => (
                  <Card key={categoryIndex}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="h-4 w-4" />
                        {category.categoryName}
                      </CardTitle>
                      <CardDescription>
                        Top 5 candidatas mais votadas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {category.candidates.map((candidate, index) => (
                          <div key={candidate.id_candidate} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <div className="w-6 h-6 bg-gradient-brand rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {index + 1}
                            </div>
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                              <img 
                                src={candidate.photo_url} 
                                alt={candidate.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder.svg';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{candidate.name}</p>
                              <p className="text-sm text-muted-foreground">{candidate.votes} votos</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
