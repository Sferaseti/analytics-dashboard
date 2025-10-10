import { EChartsOption } from 'echarts'

export interface ChartData {
  [key: string]: any
}

export interface ChartConfig {
  chartType: string
  xAxis: string
  yAxis: string
  groupBy?: string
  title?: string
  description?: string
}

export function generateChartOptions(data: ChartData[], config: ChartConfig): EChartsOption {
  const { chartType, xAxis, yAxis, groupBy, title } = config

  // Process data based on groupBy
  const processedData = groupBy ? groupData(data, groupBy, xAxis, yAxis) : data

  const baseOptions: EChartsOption = {
    title: {
      text: title || 'Отчет',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      top: 30,
      type: 'scroll'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  }

  switch (chartType) {
    case 'bar':
      return generateBarChart(processedData, config, baseOptions)
    case 'line':
      return generateLineChart(processedData, config, baseOptions)
    case 'pie':
      return generatePieChart(processedData, config, baseOptions)
    case 'area':
      return generateAreaChart(processedData, config, baseOptions)
    case 'scatter':
      return generateScatterChart(processedData, config, baseOptions)
    default:
      return generateBarChart(processedData, config, baseOptions)
  }
}

function groupData(data: ChartData[], groupBy: string, xAxis: string, yAxis: string): ChartData[] {
  const grouped = data.reduce((acc, item) => {
    const key = item[groupBy]
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<string, ChartData[]>)

  return Object.entries(grouped).map(([group, items]) => ({
    [groupBy]: group,
    [xAxis]: items.map((item: ChartData) => item[xAxis]),
    [yAxis]: items.reduce((sum: number, item: ChartData) => sum + (Number(item[yAxis]) || 0), 0),
    count: items.length
  }))
}

function generateBarChart(data: ChartData[], config: ChartConfig, baseOptions: EChartsOption): EChartsOption {
  const { xAxis, yAxis, groupBy } = config
  
  const categories = [...new Set(data.map(item => item[xAxis]))]
  
  if (groupBy) {
    const series = [...new Set(data.map(item => item[groupBy]))].map(group => ({
      name: String(group),
      type: 'bar' as const,
      data: categories.map(category => {
        const item = data.find(d => d[xAxis] === category && d[groupBy] === group)
        return item ? Number(item[yAxis]) || 0 : 0
      })
    }))

    return {
      ...baseOptions,
      xAxis: {
        type: 'category',
        data: categories
      },
      yAxis: {
        type: 'value'
      },
      series
    }
  }

  return {
    ...baseOptions,
    xAxis: {
      type: 'category',
      data: categories
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: yAxis,
      type: 'bar',
      data: categories.map(category => {
        const item = data.find(d => d[xAxis] === category)
        return item ? Number(item[yAxis]) || 0 : 0
      })
    }]
  }
}

function generateLineChart(data: ChartData[], config: ChartConfig, baseOptions: EChartsOption): EChartsOption {
  const { xAxis, yAxis, groupBy } = config
  
  const categories = [...new Set(data.map(item => item[xAxis]))].sort()
  
  if (groupBy) {
    const series = [...new Set(data.map(item => item[groupBy]))].map(group => ({
      name: String(group),
      type: 'line' as const,
      smooth: true,
      data: categories.map(category => {
        const item = data.find(d => d[xAxis] === category && d[groupBy] === group)
        return item ? Number(item[yAxis]) || 0 : 0
      })
    }))

    return {
      ...baseOptions,
      xAxis: {
        type: 'category',
        data: categories
      },
      yAxis: {
        type: 'value'
      },
      series
    }
  }

  return {
    ...baseOptions,
    xAxis: {
      type: 'category',
      data: categories
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: yAxis,
      type: 'line',
      smooth: true,
      data: categories.map(category => {
        const item = data.find(d => d[xAxis] === category)
        return item ? Number(item[yAxis]) || 0 : 0
      })
    }]
  }
}

function generatePieChart(data: ChartData[], config: ChartConfig, baseOptions: EChartsOption): EChartsOption {
  const { xAxis, yAxis } = config
  
  const pieData = data.map(item => ({
    name: String(item[xAxis]),
    value: Number(item[yAxis]) || 0
  }))

  return {
    ...baseOptions,
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [{
      name: yAxis,
      type: 'pie',
      radius: '50%',
      data: pieData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
}

function generateAreaChart(data: ChartData[], config: ChartConfig, baseOptions: EChartsOption): EChartsOption {
  const { xAxis, yAxis, groupBy } = config
  
  const categories = [...new Set(data.map(item => item[xAxis]))].sort()
  
  if (groupBy) {
    const series = [...new Set(data.map(item => item[groupBy]))].map(group => ({
      name: String(group),
      type: 'line' as const,
      areaStyle: {},
      smooth: true,
      data: categories.map(category => {
        const item = data.find(d => d[xAxis] === category && d[groupBy] === group)
        return item ? Number(item[yAxis]) || 0 : 0
      })
    }))

    return {
      ...baseOptions,
      xAxis: {
        type: 'category',
        data: categories
      },
      yAxis: {
        type: 'value'
      },
      series
    }
  }

  return {
    ...baseOptions,
    xAxis: {
      type: 'category',
      data: categories
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      name: yAxis,
      type: 'line',
      areaStyle: {},
      smooth: true,
      data: categories.map(category => {
        const item = data.find(d => d[xAxis] === category)
        return item ? Number(item[yAxis]) || 0 : 0
      })
    }]
  }
}

function generateScatterChart(data: ChartData[], config: ChartConfig, baseOptions: EChartsOption): EChartsOption {
  const { xAxis, yAxis, groupBy } = config
  
  if (groupBy) {
    const series = [...new Set(data.map(item => item[groupBy]))].map(group => ({
      name: String(group),
      type: 'scatter' as const,
      data: data
        .filter(item => item[groupBy] === group)
        .map(item => [Number(item[xAxis]) || 0, Number(item[yAxis]) || 0])
    }))

    return {
      ...baseOptions,
      xAxis: {
        type: 'value',
        name: xAxis
      },
      yAxis: {
        type: 'value',
        name: yAxis
      },
      series
    }
  }

  return {
    ...baseOptions,
    xAxis: {
      type: 'value',
      name: xAxis
    },
    yAxis: {
      type: 'value',
      name: yAxis
    },
    series: [{
      name: `${xAxis} vs ${yAxis}`,
      type: 'scatter',
      data: data.map(item => [Number(item[xAxis]) || 0, Number(item[yAxis]) || 0])
    }]
  }
}

export function getAvailableFields(dataSource: string): string[] {
  switch (dataSource) {
    case 'uonCallHistory':
      return ['callDate', 'duration', 'callType', 'managerId', 'clientId']
    case 'uonRequests':
      return ['requestDate', 'status', 'priority', 'managerId', 'clientId', 'amount']
    case 'uonBills':
      return ['billDate', 'amount', 'status', 'managerId', 'clientId']
    case 'uonClients':
      return ['createdAt', 'status', 'managerId', 'totalAmount', 'requestsCount']
    case 'uonLeads':
      return ['createdAt', 'status', 'source', 'managerId', 'convertedAt']
    case 'uonManagers':
      return ['name', 'department', 'callsCount', 'requestsCount', 'totalAmount']
    default:
      return []
  }
}

export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    callDate: 'Дата звонка',
    duration: 'Длительность',
    callType: 'Тип звонка',
    managerId: 'Менеджер',
    clientId: 'Клиент',
    requestDate: 'Дата заявки',
    status: 'Статус',
    priority: 'Приоритет',
    amount: 'Сумма',
    billDate: 'Дата счета',
    createdAt: 'Дата создания',
    totalAmount: 'Общая сумма',
    requestsCount: 'Количество заявок',
    source: 'Источник',
    convertedAt: 'Дата конверсии',
    name: 'Имя',
    department: 'Отдел',
    callsCount: 'Количество звонков'
  }
  
  return labels[field] || field
}