import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/button-variants';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DailyData {
  date: string;
  votes: number;
  revenue: number;
}

interface VotesAndRevenueChartProps {
  votesData: Array<{ date: string; votes: number }>;
  revenueData: Array<{ date: string; revenue: number }>;
}

type FilterPeriod = '7d' | '14d' | '30d';

export function VotesAndRevenueChart({ votesData, revenueData }: VotesAndRevenueChartProps) {
  const [period, setPeriod] = useState<FilterPeriod>('7d');

  const periodDays = {
    '7d': 7,
    '14d': 14,
    '30d': 30
  };

  // Combinar dados de votos e faturamento
  const combinedData = useMemo(() => {
    const dataMap = new Map<string, DailyData>();
    
    // Adicionar votos
    votesData.forEach(item => {
      dataMap.set(item.date, {
        date: item.date,
        votes: item.votes,
        revenue: 0
      });
    });
    
    // Adicionar faturamento
    revenueData.forEach(item => {
      const existing = dataMap.get(item.date);
      if (existing) {
        existing.revenue = item.revenue;
      } else {
        dataMap.set(item.date, {
          date: item.date,
          votes: 0,
          revenue: item.revenue
        });
      }
    });
    
    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [votesData, revenueData]);

  const filteredData = useMemo(() => {
    const days = periodDays[period];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filtrar dados até hoje e pegar os últimos X dias
    const dataUntilToday = combinedData.filter(d => {
      const itemDate = new Date(d.date);
      return itemDate <= today;
    });
    
    return dataUntilToday.slice(-days);
  }, [combinedData, period]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        todayVotes: 0,
        todayRevenue: 0,
        periodTotalVotes: 0,
        periodTotalRevenue: 0,
        votesChange: 0,
        revenueChange: 0,
        dailyData: [],
        hasMovement: false
      };
    }

    const todayData = filteredData[filteredData.length - 1];
    const todayVotes = todayData?.votes || 0;
    const todayRevenue = todayData?.revenue || 0;
    
    const periodTotalVotes = filteredData.reduce((sum, d) => sum + d.votes, 0);
    const periodTotalRevenue = filteredData.reduce((sum, d) => sum + d.revenue, 0);
    
    // Calcular variação do período (últimos X dias vs X dias anteriores)
    const currentPeriodVotes = filteredData.slice(-periodDays[period]).reduce((sum, d) => sum + d.votes, 0);
    const currentPeriodRevenue = filteredData.slice(-periodDays[period]).reduce((sum, d) => sum + d.revenue, 0);
    
    const previousPeriodData = combinedData.slice(-(periodDays[period] * 2), -periodDays[period]);
    const previousPeriodVotes = previousPeriodData.reduce((sum, d) => sum + d.votes, 0);
    const previousPeriodRevenue = previousPeriodData.reduce((sum, d) => sum + d.revenue, 0);
    
    const votesChange = previousPeriodVotes > 0 
      ? ((currentPeriodVotes - previousPeriodVotes) / previousPeriodVotes) * 100 
      : currentPeriodVotes > 0 ? 100 : 0;
      
    const revenueChange = previousPeriodRevenue > 0 
      ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
      : currentPeriodRevenue > 0 ? 100 : 0;

    // Preparar dados diários para a lista em ordem decrescente
    const dailyData = [...filteredData]
      .reverse() // Inverter para mostrar do mais recente para o mais antigo
      .map((day, index) => {
        // Para cálculo de mudança, comparar com o dia seguinte (que vem depois no array invertido)
        const nextDayVotes = index < filteredData.length - 1 ? filteredData[filteredData.length - 1 - index - 1].votes : 0;
        const nextDayRevenue = index < filteredData.length - 1 ? filteredData[filteredData.length - 1 - index - 1].revenue : 0;
        
        const votesChangeDay = nextDayVotes > 0 
          ? ((day.votes - nextDayVotes) / nextDayVotes) * 100 
          : day.votes > 0 ? 100 : 0;
          
        const revenueChangeDay = nextDayRevenue > 0 
          ? ((day.revenue - nextDayRevenue) / nextDayRevenue) * 100 
          : day.revenue > 0 ? 100 : 0;
        
        return {
          ...day,
          votesChange: votesChangeDay,
          revenueChange: revenueChangeDay
        };
      });

    const hasMovement = periodTotalVotes > 0 || periodTotalRevenue > 0;

    return {
      todayVotes,
      todayRevenue,
      periodTotalVotes,
      periodTotalRevenue,
      votesChange,
      revenueChange,
      dailyData,
      hasMovement
    };
  }, [filteredData, period, combinedData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Votos e Faturamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Hoje</p>
            <p className="text-xl md:text-2xl font-bold">{stats.todayVotes} votos</p>
            <p className="text-xl md:text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Últimos {periodDays[period]} dias</p>
            <div className="flex items-center gap-2">
              <p className="text-xl md:text-2xl font-bold">{stats.periodTotalVotes}</p>
              <div className="flex items-center gap-1 text-sm">
                {stats.votesChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={stats.votesChange >= 0 ? 'text-success' : 'text-destructive'}>
                  {stats.votesChange >= 0 ? '+' : ''}{stats.votesChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl md:text-2xl font-bold">{formatCurrency(stats.periodTotalRevenue)}</p>
              <div className="flex items-center gap-1 text-sm">
                {stats.revenueChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={stats.revenueChange >= 0 ? 'text-success' : 'text-destructive'}>
                  {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {(['7d', '14d', '30d'] as FilterPeriod[]).map((p) => (
            <CustomButton
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="flex-1 min-h-[44px]"
            >
              {p}
            </CustomButton>
          ))}
        </div>

        {/* Lista de dias */}
        {stats.hasMovement ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {stats.dailyData.map((day) => (
              <div key={day.date} className="flex items-center gap-3 py-3 border-b last:border-0">
                <div className="flex-shrink-0 w-16 text-sm font-medium">
                  {formatDate(day.date)}
                </div>
                <div className="flex-1 space-y-2">
                  {/* Votos */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Votos:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">
                        {day.votes}
                      </span>
                      <span className={`text-sm flex items-center gap-1 min-w-[60px] ${
                        day.votesChange >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {day.votesChange >= 0 ? '↑' : '↓'} {Math.abs(day.votesChange).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Faturamento */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Faturamento:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">
                        {formatCurrency(day.revenue)}
                      </span>
                      <span className={`text-sm flex items-center gap-1 min-w-[60px] ${
                        day.revenueChange >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {day.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(day.revenueChange).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Sem movimento nos últimos {periodDays[period]} dias
          </div>
        )}
      </CardContent>
    </Card>
  );
}
