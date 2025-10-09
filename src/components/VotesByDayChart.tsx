import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomButton } from '@/components/ui/button-variants';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';

interface DailyData {
  date: string;
  votes: number;
}

interface VotesByDayChartProps {
  data: DailyData[];
}

type FilterPeriod = '7d' | '14d' | '30d';

export function VotesByDayChart({ data }: VotesByDayChartProps) {
  const [period, setPeriod] = useState<FilterPeriod>('7d');

  const periodDays = {
    '7d': 7,
    '14d': 14,
    '30d': 30
  };

  const filteredData = useMemo(() => {
    const days = periodDays[period];
    console.log('VotesByDayChart - data:', data);
    console.log('VotesByDayChart - period:', period, 'days:', days);
    const result = data.slice(-days);
    console.log('VotesByDayChart - filteredData:', result);
    return result;
  }, [data, period]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        today: 0,
        periodTotal: 0,
        periodChange: 0,
        dailyData: [],
        hasMovement: false
      };
    }

    const today = filteredData[filteredData.length - 1]?.votes || 0;
    const periodTotal = filteredData.reduce((sum, d) => sum + d.votes, 0);
    
    // Calcular variação do período (últimos X dias vs X dias anteriores)
    const currentPeriodTotal = filteredData.slice(-periodDays[period]).reduce((sum, d) => sum + d.votes, 0);
    const previousPeriodData = data.slice(-(periodDays[period] * 2), -periodDays[period]);
    const previousPeriodTotal = previousPeriodData.reduce((sum, d) => sum + d.votes, 0);
    
    const periodChange = previousPeriodTotal > 0 
      ? ((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100 
      : currentPeriodTotal > 0 ? 100 : 0;

    // Preparar dados diários para a lista (últimos 7 dias sempre)
    const last7Days = filteredData.slice(-7);
    const dailyData = last7Days.map((day, index) => {
      const prevDayVotes = index > 0 ? last7Days[index - 1].votes : 0;
      const change = prevDayVotes > 0 
        ? ((day.votes - prevDayVotes) / prevDayVotes) * 100 
        : day.votes > 0 ? 100 : 0;
      
      return {
        ...day,
        change,
        barWidth: periodTotal > 0 ? (day.votes / periodTotal) * 100 : 0
      };
    });

    const hasMovement = periodTotal > 0;

    return {
      today,
      periodTotal,
      periodChange,
      dailyData,
      hasMovement
    };
  }, [filteredData, period, data]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold">{formatDate(payload[0].payload.date)}</p>
          <p className="text-lg font-bold text-success">{payload[0].value} votos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Votos por dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Hoje</p>
            <p className="text-2xl md:text-3xl font-bold">{stats.today}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Últimos {periodDays[period]} dias</p>
            <p className="text-2xl md:text-3xl font-bold">{stats.periodTotal}</p>
            <div className="flex items-center gap-1 text-sm">
              {stats.periodChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={stats.periodChange >= 0 ? 'text-success' : 'text-destructive'}>
                {stats.periodChange >= 0 ? '+' : ''}{stats.periodChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline */}
        {stats.hasMovement && (
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData}>
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="votes" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

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
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {stats.dailyData.map((day) => (
              <div key={day.date} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="flex-shrink-0 w-16 text-sm font-medium">
                  {formatDate(day.date)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-base md:text-lg">
                      {day.votes} votos
                    </span>
                    <span className={`text-sm flex items-center gap-1 ${
                      day.change >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {day.change >= 0 ? '↑' : '↓'} {Math.abs(day.change).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success transition-all"
                      style={{ width: `${day.barWidth}%` }}
                    />
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
