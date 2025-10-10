'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartsWrapperProps {
  option: any;
  style?: React.CSSProperties;
  className?: string;
  theme?: string;
}

export default function EChartsWrapper({ 
  option, 
  style = { height: '400px', width: '100%' }, 
  className = '',
  theme = 'default'
}: EChartsWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      // Инициализация графика
      chartInstance.current = echarts.init(chartRef.current, theme);
      
      // Обработчик изменения размера
      const handleResize = () => {
        chartInstance.current?.resize();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.current?.dispose();
      };
    }
  }, [theme]);

  useEffect(() => {
    if (chartInstance.current && option) {
      chartInstance.current.setOption(option, true);
    }
  }, [option]);

  return <div ref={chartRef} style={style} className={className} />;
}