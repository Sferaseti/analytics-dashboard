'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

interface OverviewChartProps {
  data?: Array<{
    month: string;
    registrations: number;
  }>;
}

export function OverviewChart({ data = [] }: OverviewChartProps) {
  // Преобразуем данные для графика
  const chartData = data.length > 0 ? data.map(item => ({
    name: item.month,
    total: item.registrations
  })) : [
    { name: 'Янв', total: 1200 },
    { name: 'Фев', total: 1900 },
    { name: 'Мар', total: 800 },
    { name: 'Апр', total: 1800 },
    { name: 'Май', total: 2000 },
    { name: 'Июн', total: 2400 },
    { name: 'Июл', total: 2200 },
    { name: 'Авг', total: 2800 },
    { name: 'Сен', total: 2600 },
    { name: 'Окт', total: 3200 },
    { name: 'Ноя', total: 2900 },
    { name: 'Дек', total: 3400 },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip />
        <Bar dataKey="total" fill="#adfa1d" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}