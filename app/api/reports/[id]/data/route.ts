import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { getReportById } from '@/lib/db/queries/reports';
import { 
  getCallStatsByDateRange,
  getManagerCallStats,
  getClientStats,
  getLeadStats,
  getRequestStats,
  getBillStats
} from '@/lib/db/queries/uon-data';

interface ReportConfig {
  chartType: string;
  dataSource: string;
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  dateRange: string;
  filters: Record<string, any>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const reportId = parseInt(resolvedParams.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const report = await getReportById(reportId, userWithTeam.teamId);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const config: ReportConfig = JSON.parse(report.config);
    const { searchParams } = new URL(request.url);
    const customDateFrom = searchParams.get('dateFrom');
    const customDateTo = searchParams.get('dateTo');

    // Определяем диапазон дат
    let dateFrom: Date;
    let dateTo: Date = new Date();

    if (customDateFrom && customDateTo) {
      dateFrom = new Date(customDateFrom);
      dateTo = new Date(customDateTo);
    } else {
      switch (config.dateRange) {
        case 'last_7_days':
          dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_30_days':
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_90_days':
          dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'current_month':
          dateFrom = new Date(dateTo.getFullYear(), dateTo.getMonth(), 1);
          break;
        case 'last_month':
          dateFrom = new Date(dateTo.getFullYear(), dateTo.getMonth() - 1, 1);
          dateTo = new Date(dateTo.getFullYear(), dateTo.getMonth(), 0);
          break;
        case 'current_year':
          dateFrom = new Date(dateTo.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // Получаем данные в зависимости от источника
    let data: any[] = [];

    switch (config.dataSource) {
      case 'uon_call_history':
        if (config.groupBy === 'manager_id') {
          data = await getManagerCallStats(userWithTeam.teamId, dateFrom, dateTo);
        } else {
          data = await getCallStatsByDateRange(userWithTeam.teamId, dateFrom, dateTo);
        }
        break;

      case 'uon_clients':
        data = await getClientStats(userWithTeam.teamId);
        break;

      case 'uon_leads':
        data = await getLeadStats(userWithTeam.teamId);
        break;

      case 'uon_requests':
        data = await getRequestStats(userWithTeam.teamId);
        break;

      case 'uon_bills':
        data = await getBillStats(userWithTeam.teamId, dateFrom, dateTo);
        break;

      default:
        return NextResponse.json({ error: 'Unsupported data source' }, { status: 400 });
    }

    // Форматируем данные для ECharts
    const chartData = formatDataForChart(data, config);

    return NextResponse.json({
      data: chartData,
      config,
      dateRange: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatDataForChart(data: any[], config: ReportConfig) {
  if (!data || data.length === 0) {
    return {
      xAxis: [],
      series: []
    };
  }

  const xAxisData = data.map(item => {
    if (config.xAxis === 'date') {
      return new Date(item.date).toLocaleDateString('ru-RU');
    }
    return item[config.xAxis] || '';
  });

  const yAxisData = data.map(item => {
    const value = item[config.yAxis];
    return typeof value === 'number' ? value : 0;
  });

  switch (config.chartType) {
    case 'pie':
      return {
        series: [{
          type: 'pie',
          data: data.map(item => ({
            name: item[config.xAxis] || 'Unknown',
            value: item[config.yAxis] || 0
          }))
        }]
      };

    case 'line':
    case 'bar':
    case 'scatter':
      return {
        xAxis: {
          type: 'category',
          data: xAxisData
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          type: config.chartType === 'scatter' ? 'scatter' : config.chartType,
          data: yAxisData
        }]
      };

    default:
      return {
        xAxis: {
          type: 'category',
          data: xAxisData
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          type: 'bar',
          data: yAxisData
        }]
      };
  }
}