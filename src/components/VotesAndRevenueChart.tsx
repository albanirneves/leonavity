import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DailyData {
  date: string;
  votes: number;
  revenue: number;
}

interface VotesAndRevenueChartProps {
  votesData: Array<{ date: string; votes: number }>;
  revenueData: Array<{ date: string; revenue: number }>;
}

export function VotesAndRevenueChart({ votesData, revenueData }: VotesAndRevenueChartProps) {

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filtrar dados até hoje
    const dataUntilToday = combinedData.filter(d => {
      const itemDate = new Date(d.date);
      return itemDate <= today;
    });
    
    return dataUntilToday;
  }, [combinedData]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        todayVotes: 0,
        todayRevenue: 0,
        dailyData: [],
        hasMovement: false
      };
    }

    const todayData = filteredData[filteredData.length - 1];
    const todayVotes = todayData?.votes || 0;
    const todayRevenue = todayData?.revenue || 0;

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

    const hasMovement = filteredData.some(d => d.votes > 0 || d.revenue > 0);

    return {
      todayVotes,
      todayRevenue,
      dailyData,
      hasMovement
    };
  }, [filteredData]);

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
        {/* KPI - Hoje */}
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Hoje</p>
          <div className="flex items-center gap-4">
            <p className="text-xl md:text-2xl font-bold">{stats.todayVotes} votos</p>
            <p className="text-xl md:text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</p>
          </div>
        </div>

        {/* Lista de dias */}
        {stats.hasMovement ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {stats.dailyData.map((day) => (
              <div key={day.date} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex-shrink-0 w-16 text-sm font-medium">
                  {formatDate(day.date)}
                </div>
                <div className="flex items-center gap-6">
                  {/* Votos */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Votos:</span>
                    <span className="font-semibold text-base">{day.votes}</span>
                    <span className={`text-sm ${
                      day.votesChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {day.votesChange >= 0 ? '↑' : '↓'} {Math.abs(day.votesChange).toFixed(0)}%
                    </span>
                  </div>
                  
                  {/* Faturamento */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Fatu:</span>
                    <span className="font-semibold text-base">{formatCurrency(day.revenue)}</span>
                    <span className={`text-sm ${
                      day.revenueChange >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {day.revenueChange >= 0 ? '↑' : '↓'} {Math.abs(day.revenueChange).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Sem movimento
          </div>
        )}
      </CardContent>
    </Card>
  );
}
