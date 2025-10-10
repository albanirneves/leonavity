import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomButton } from '@/components/ui/button-variants';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  Search,
  History
} from 'lucide-react';
import { RevenueByDayChart } from '@/components/RevenueByDayChart';
import { VotesByDayChart } from '@/components/VotesByDayChart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: number;
  name: string;
  start_vote: string;
  end_vote: string;
  vote_value: number;
  pix_tax: number;
  card_tax: number;
}

interface WeeklyHistory {
  weekStart: string;
  weekEnd: string;
  totalVotes: number;
  netRevenue: number;
}

interface DashboardStats {
  votesActive: number;
  grossRevenue: number;
  netRevenue: number;
  topCandidates: Array<{
    name: string;
    votes: number;
    totalInvested: number;
    netRevenue: number;
    event: string;
    category: string;
    photo_url?: string;
    id_candidate: number;
    id_category: number;
  }>;
  weeklyMovement: Array<{
    id: string;
    phone: string;
    votes: number;
    created_at: string;
    candidate_name: string;
    candidate_photo: string;
    category_name: string;
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
    weeklyMovement: [],
    totalCandidates: 0,
    revenueChart: [],
    votesChart: [],
    categoryRankings: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{
    name: string;
    id_candidate: number;
    id_category: number;
    photo_url?: string;
  } | null>(null);
  const [candidateVotes, setCandidateVotes] = useState<Array<{
    id: string;
    phone: string;
    votes: number;
    created_at: string;
    category_name: string;
  }>>([]);
  const [candidateVotesLoading, setCandidateVotesLoading] = useState(false);
  const { toast } = useToast();

  const activeTab = searchParams.get('tab') || 'overview';

  const generateWeeklyRanges = (startDate: string, endDate: string): Array<{start: Date, end: Date}> => {
    const weeks = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Encontrar a primeira segunda-feira
    const firstMonday = new Date(start);
    const dayOfWeek = firstMonday.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    firstMonday.setDate(firstMonday.getDate() + daysToMonday);
    
    let currentWeekStart = new Date(firstMonday);
    
    while (currentWeekStart <= end) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Domingo
      
      if (currentWeekStart <= end) {
        weeks.push({
          start: new Date(currentWeekStart),
          end: weekEnd > end ? new Date(end) : new Date(weekEnd)
        });
      }
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  };

  const fetchWeeklyHistory = async () => {
    if (!selectedEvent) return;
    
    setHistoryLoading(true);
    try {
      const event = events.find(e => e.id.toString() === selectedEvent);
      if (!event) return;
      
      // Fazer uma única consulta para todos os votos do evento
      const { data: allVotes, error } = await supabase
        .from('votes')
        .select('votes, payment_status, created_at')
        .eq('id_event', parseInt(selectedEvent))
        .gte('created_at', event.start_vote)
        .lte('created_at', event.end_vote)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching votes:', error);
        throw error;
      }
      
      const weeks = generateWeeklyRanges(event.start_vote, event.end_vote);
      const history: WeeklyHistory[] = [];
      
      // Processar dados localmente para cada semana
      for (const week of weeks) {
        const weekVotes = allVotes?.filter(vote => {
          const voteDate = new Date(vote.created_at);
          return voteDate >= week.start && voteDate <= week.end;
        }) || [];
        
        const totalVotes = weekVotes.reduce((sum, vote) => sum + (vote.votes || 0), 0);
        
        // Calcular faturamento líquido
        const paidVotes = weekVotes.filter(vote => vote.payment_status === 'approved');
        const grossRevenue = paidVotes.reduce((sum, vote) => sum + (vote.votes || 0), 0) * event.vote_value;
        
        // Aplicar taxas baseadas no payment_status (assumindo PIX como padrão)
        const pixTaxRate = event.pix_tax / 100;
        const netRevenue = grossRevenue * (1 - pixTaxRate);
        
        history.push({
          weekStart: week.start.toLocaleDateString('pt-BR'),
          weekEnd: week.end.toLocaleDateString('pt-BR'),
          totalVotes,
          netRevenue
        });
      }
      
      setWeeklyHistory(history);
    } catch (error) {
      console.error('Error fetching weekly history:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico semanal',
        variant: 'destructive'
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_vote, end_vote, vote_value, pix_tax, card_tax')
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

      // 4. Buscar candidatas e categorias do evento
      const [candidatesResult, categoriesResult] = await Promise.all([
        supabase
          .from('candidates')
          .select('id_candidate, id_category, name')
          .eq('id_event', eventId),
        supabase
          .from('categories')
          .select('id_category, name')
          .eq('id_event', eventId)
          .order('id_category', { ascending: true })
      ]);

      if (candidatesResult.error) throw candidatesResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      const categoryNameMap = new Map<number, string>(
        (categoriesResult.data || []).map((c) => [c.id_category, c.name])
      );

      // Buscar TODOS os votos aprovados do evento de uma vez só (incluindo changed_to_card para calcular taxas)
      const { data: allApprovedVotes, error: allVotesError } = await supabase
        .from('votes')
        .select('id_candidate, id_category, votes, changed_to_card')
        .eq('id_event', eventId)
        .eq('payment_status', 'approved')
        .range(0, 999999);

      if (allVotesError) throw allVotesError;

      // Criar mapas de votos e valor investido (com taxas) por candidata
      const votesMap = new Map<string, number>();
      const investedMap = new Map<string, number>();
      const netRevenueMap = new Map<string, number>();
      
      (allApprovedVotes || []).forEach(vote => {
        const key = `${vote.id_category}_${vote.id_candidate}`;
        const voteCount = Number(vote.votes) || 0;
        const baseValue = voteCount * Number(eventData.vote_value);
        
        // Somar votos
        const currentVotes = votesMap.get(key) || 0;
        votesMap.set(key, currentVotes + voteCount);
        
        // Somar valor líquido (sem taxas)
        const currentNet = netRevenueMap.get(key) || 0;
        netRevenueMap.set(key, currentNet + baseValue);
        
        // Somar valor investido (com taxas)
        const currentInvested = investedMap.get(key) || 0;
        const tax = vote.changed_to_card ? Number(eventData.card_tax) : Number(eventData.pix_tax);
        const grossValue = baseValue * (100 + tax) / 100;
        investedMap.set(key, currentInvested + grossValue);
      });

      // Calcular votos para cada candidata usando os mapas
      const candidatesWithVotes = (candidatesResult.data || []).map(candidate => {
        const key = `${candidate.id_category}_${candidate.id_candidate}`;
        const totalVotes = votesMap.get(key) || 0;
        const totalInvested = investedMap.get(key) || 0;
        const netRevenue = netRevenueMap.get(key) || 0;

        return {
          name: candidate.name,
          votes: totalVotes,
          totalInvested,
          netRevenue,
          event: 'Evento Atual',
          category: categoryNameMap.get(candidate.id_category) || `Categoria ${candidate.id_category}`,
          photo_url: `https://waslpdqekbwxptwgpjze.supabase.co/storage/v1/object/public/candidates/event_${eventId}_category_${candidate.id_category}_candidate_${candidate.id_candidate}.jpg`,
          id_candidate: candidate.id_candidate,
          id_category: candidate.id_category
        };
      });

      // Ordenar por votos
      const topCandidates = candidatesWithVotes
        .sort((a, b) => b.votes - a.votes);

      // 5. Buscar movimento semanal (votos da semana atual)
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Segunda-feira
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Domingo
      currentWeekEnd.setHours(23, 59, 59, 999);

      const { data: weeklyVotes } = await supabase
        .from('votes')
        .select(`
          id, 
          phone, 
          votes, 
          created_at,
          id_candidate,
          id_category
        `)
        .eq('id_event', eventId)
        .eq('payment_status', 'approved')
        .gte('created_at', currentWeekStart.toISOString())
        .lte('created_at', currentWeekEnd.toISOString())
        .order('created_at', { ascending: false })
        .range(0, 999999);

      // Criar mapa de candidatas para enriquecimento rápido
      const candidatesMap = new Map(
        (candidatesResult.data || []).map(c => [
          `${c.id_category}_${c.id_candidate}`,
          c.name
        ])
      );

      // Enriquecer dados dos votos com informações das candidatas (sem queries adicionais)
      const weeklyMovement = (weeklyVotes || []).map(vote => {
        const key = `${vote.id_category}_${vote.id_candidate}`;
        const candidate_photo = `https://waslpdqekbwxptwgpjze.supabase.co/storage/v1/object/public/candidates/event_${eventId}_category_${vote.id_category}_candidate_${vote.id_candidate}.jpg`;

        return {
          id: vote.id.toString(),
          phone: vote.phone,
          votes: vote.votes,
          created_at: vote.created_at,
          candidate_name: candidatesMap.get(key) || `Candidata ${vote.id_candidate}`,
          candidate_photo,
          category_name: categoryNameMap.get(vote.id_category) || `Categoria ${vote.id_category}`,
        };
      });

      // 6. Buscar total de candidatas do evento
      const totalCandidates = candidatesResult.data?.length || 0;

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
          .lte('created_at', endDate.toISOString())
          .range(0, 999999);

        // Processar dados para os gráficos considerando fuso horário brasileiro (UTC-3)
        revenueChart = dates.map(date => {
          const dayVotes = dailyVotes?.filter(vote => {
            // Converter timestamp UTC para horário brasileiro (UTC-3)
            const voteDate = new Date(vote.created_at);
            voteDate.setHours(voteDate.getHours() - 3);
            const voteDateStr = voteDate.toISOString().split('T')[0];
            return voteDateStr === date;
          }) || [];
          
          const dayRevenue = dayVotes.reduce((sum, vote) => {
            const voteValue = Number(eventData.vote_value);
            const votes = Number(vote.votes) || 0;
            return sum + (voteValue * votes);
          }, 0);

          return { date, revenue: dayRevenue };
        });

        votesChart = dates.map(date => {
          const dayVotes = dailyVotes?.filter(vote => {
            // Converter timestamp UTC para horário brasileiro (UTC-3)
            const voteDate = new Date(vote.created_at);
            voteDate.setHours(voteDate.getHours() - 3);
            const voteDateStr = voteDate.toISOString().split('T')[0];
            return voteDateStr === date;
          }) || [];
          
          const totalVotes = dayVotes.reduce((sum, vote) => 
            sum + (Number(vote.votes) || 0), 0
          );

          return { date, votes: totalVotes };
        });
      }

      // Criar rankings por categoria usando os dados já carregados
      const categoryRankings = (categoriesResult.data || []).map(category => {
        // Filtrar candidatas desta categoria
        const categoryCandidates = candidatesWithVotes
          .filter(c => c.id_category === category.id_category)
          .sort((a, b) => b.votes - a.votes)
          .slice(0, 5)
          .map(c => ({
            name: c.name,
            votes: c.votes,
            photo_url: c.photo_url,
            id_candidate: c.id_candidate
          }));

        return {
          categoryName: category.name,
          candidates: categoryCandidates
        };
      });

      setStats({
        votesActive: votesActiveCount,
        grossRevenue,
        netRevenue,
        topCandidates,
        weeklyMovement,
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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // Zera as horas para comparar apenas a data
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const voteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Se foi hoje, mostra apenas HH:mm:ss
    if (todayDate.getTime() === voteDate.getTime()) {
      return {
        isToday: true,
        time: date.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })
      };
    }
    
    // Se foi ontem ou antes, mostra DD/MM/YYYY e HH:mm:ss separados
    return {
      isToday: false,
      date: date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  };

  const formatPhone = (phone: string) => {
    // Remove non-numeric characters
    const numbers = phone.replace(/\D/g, '');
    
    // Format as (XX) XXXXX-XXXX
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    // Format as (XX) XXXX-XXXX for 10 digits
    if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    
    return phone;
  };

  const fetchCandidateVotes = async (candidate: { name: string; id_candidate: number; id_category: number; photo_url?: string }) => {
    if (!selectedEvent) return;
    
    setCandidateVotesLoading(true);
    setSelectedCandidate(candidate);
    
    try {
      const eventId = parseInt(selectedEvent);
      
      const { data: votes, error } = await supabase
        .from('votes')
        .select('id, phone, votes, created_at, id_category')
        .eq('id_event', eventId)
        .eq('id_candidate', candidate.id_candidate)
        .eq('id_category', candidate.id_category)
        .eq('payment_status', 'approved')
        .order('created_at', { ascending: false })
        .range(0, 999999);
      
      if (error) throw error;
      
      // Buscar nome da categoria
      const { data: categoryData } = await supabase
        .from('categories')
        .select('name')
        .eq('id_event', eventId)
        .eq('id_category', candidate.id_category)
        .single();
      
      const categoryName = categoryData?.name || `Categoria ${candidate.id_category}`;
      
      const votesWithCategory = (votes || []).map(vote => ({
        id: vote.id.toString(),
        phone: vote.phone,
        votes: vote.votes,
        created_at: vote.created_at,
        category_name: categoryName
      }));
      
      setCandidateVotes(votesWithCategory);
    } catch (error) {
      console.error('Error fetching candidate votes:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar votos da candidata',
        variant: 'destructive'
      });
    } finally {
      setCandidateVotesLoading(false);
    }
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

  // Se não há eventos cadastrados, exibir mensagem
  if (events.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                Nenhum evento cadastrado!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cadastre um evento para começar a visualizar os dados.
              </p>
            </CardContent>
          </Card>
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
            {/* Weekly Movement */}
            <Card className="h-[500px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Últimos Votos
                    </CardTitle>
                    <CardDescription>
                      Votos realizados esta semana (Segunda a Domingo)
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchWeeklyHistory}
                        className="flex items-center gap-2"
                      >
                        <History className="h-4 w-4" />
                        Histórico
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Histórico Semanal</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto">
                        {historyLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <LoadingSpinner />
                          </div>
                        ) : weeklyHistory.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            Nenhum dado encontrado
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {weeklyHistory.map((week, index) => (
                              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <p className="font-medium">
                                    Semana {week.weekStart} a {week.weekEnd}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {week.totalVotes} voto{week.totalVotes !== 1 ? 's' : ''} - R$ {week.netRevenue.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full overflow-y-auto px-6 pb-6">
                  <div className="space-y-4">
                    {stats.weeklyMovement.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum voto encontrado esta semana
                      </div>
                    ) : (
                      stats.weeklyMovement.map((vote) => (
                        <div key={vote.id} className="flex items-start gap-3 border-b border-muted pb-4">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={vote.candidate_photo}
                              alt={vote.candidate_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <p className="font-medium text-sm md:text-base leading-tight">
                                {vote.candidate_name}
                              </p>
                              <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full w-fit">
                                {vote.category_name}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs md:text-sm text-muted-foreground">
                              <span className="font-mono">{formatPhone(vote.phone)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span>{vote.votes} voto{vote.votes > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-muted-foreground leading-tight">
                              {(() => {
                                const formatted = formatRelativeTime(vote.created_at);
                                if (formatted.isToday) {
                                  return <span>{formatted.time}</span>;
                                }
                                return (
                                  <div className="flex flex-col items-end">
                                    <span>{formatted.date}</span>
                                    <span>{formatted.time}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
                   <div className="space-y-4">
                    {stats.topCandidates.map((candidate, index) => (
                      <div 
                        key={index} 
                        className="border-b border-muted pb-3 last:border-0 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-2 -mx-2"
                        onClick={() => fetchCandidateVotes({
                          name: candidate.name,
                          id_candidate: candidate.id_candidate,
                          id_category: candidate.id_category,
                          photo_url: candidate.photo_url
                        })}
                      >
                        <div className="flex items-start gap-3">
                          {/* Número da posição */}
                          <div className="w-6 h-6 bg-gradient-brand rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-1">
                            {index + 1}
                          </div>
                          
                          {/* Avatar da candidata */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={candidate.photo_url || '/placeholder.svg'}
                              alt={candidate.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder.svg';
                              }}
                            />
                          </div>
                          
                          {/* Informações da candidata */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-medium text-sm md:text-base">{candidate.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              👑 {candidate.category}
                            </p>
                            <p className="text-sm font-bold text-brand-600">{candidate.votes} votos</p>
                            
                            {/* Informações financeiras */}
                            <div className="space-y-0.5 pt-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Valor investido:</span>
                                <span className="font-semibold text-success-600">
                                  {formatCurrency(candidate.totalInvested)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Valor líquido:</span>
                                <span className="font-semibold">
                                  {formatCurrency(candidate.netRevenue || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Taxas:</span>
                                <span className="font-semibold text-warning-600">
                                  {formatCurrency((candidate.totalInvested || 0) - (candidate.netRevenue || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            <RevenueByDayChart data={stats.revenueChart} />
            <VotesByDayChart data={stats.votesChart} />
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

      {/* Modal de votos da candidata */}
      <Dialog open={selectedCandidate !== null} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedCandidate && (
                <>
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={selectedCandidate.photo_url || '/placeholder.svg'}
                      alt={selectedCandidate.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div>
                    <div className="font-semibold">{selectedCandidate.name}</div>
                    <div className="text-sm text-muted-foreground font-normal flex items-center gap-2">
                      <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full">
                        {candidateVotes.length > 0 ? candidateVotes[0].category_name : ''}
                      </span>
                      <span>Todos os votos recebidos</span>
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {candidateVotesLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : candidateVotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum voto encontrado
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {candidateVotes.map((vote) => (
                  <div key={vote.id} className="flex items-start justify-between border-b border-muted pb-2 last:border-0 gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {vote.votes} voto{vote.votes > 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {formatPhone(vote.phone)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-muted-foreground leading-tight whitespace-nowrap">
                        {(() => {
                          const formatted = formatRelativeTime(vote.created_at);
                          if (formatted.isToday) {
                            return <span>{formatted.time}</span>;
                          }
                          return (
                            <div className="flex flex-col items-end">
                              <span>{formatted.date}</span>
                              <span>{formatted.time}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
