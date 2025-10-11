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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
          <div className="space-y-2">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[50px_60px_1fr] gap-1 px-2 pb-2 border-b text-xs text-muted-foreground font-medium">
              <div>Data</div>
              <div className="text-right">Votos</div>
              <div className="text-right">Faturamento</div>
            </div>
            
            {/* Lista com scroll */}
            <div className="max-h-[280px] overflow-y-auto">
              {stats.dailyData.map((day) => (
                <div key={day.date} className="grid grid-cols-[50px_60px_1fr] gap-1 items-center py-2 px-2 border-b last:border-0">
                  <div className="text-xs font-medium">
                    {formatDate(day.date)}
                  </div>
                  
                  {/* Votos */}
                  <div className="text-right">
                    <span className="font-semibold text-xs">{day.votes}</span>
                  </div>
                  
                  {/* Faturamento */}
                  <div className="text-right">
                    <span className="font-semibold text-xs">{formatCurrency(day.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
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
