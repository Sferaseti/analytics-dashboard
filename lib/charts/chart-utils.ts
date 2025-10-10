import { UonRequest, UonBill, UonClient, UonLead, UonManager } from '@/lib/api/uon-client'

// График заявок по статусам
export const getRequestsStatusChart = (requests: UonRequest[] = []) => {
  const statusCounts = requests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusLabels = {
    'new': 'Новые',
    'in_progress': 'В работе',
    'confirmed': 'Подтверждены',
    'cancelled': 'Отменены',
    'completed': 'Завершены'
  }

  return {
    title: {
      text: 'Заявки по статусам',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: 'Заявки',
        type: 'pie',
        radius: '50%',
        data: Object.entries(statusCounts).map(([status, count]) => ({
          value: count,
          name: statusLabels[status as keyof typeof statusLabels] || status
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
}

// График продаж по месяцам
export const getSalesChart = (bills: UonBill[] = []) => {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  
  // Группируем счета по месяцам
  const monthlyData = bills.reduce((acc, bill) => {
    const date = new Date(bill.created_at)
    const month = date.getMonth()
    
    if (!acc[month]) {
      acc[month] = { sales: 0, count: 0 }
    }
    
    if (bill.status === 'paid') {
      acc[month].sales += bill.amount
    }
    acc[month].count += 1
    
    return acc
  }, {} as Record<number, { sales: number, count: number }>)

  const salesData = months.map((_, index) => monthlyData[index]?.sales || 0)
  const requestsData = months.map((_, index) => monthlyData[index]?.count || 0)

  return {
    title: {
      text: 'Продажи и количество счетов по месяцам',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['Продажи (руб)', 'Количество счетов'],
      top: 30
    },
    xAxis: [
      {
        type: 'category',
        axisTick: {
          alignWithLabel: true
        },
        data: months
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'Продажи',
        position: 'left',
        axisLabel: {
          formatter: '{value} ₽'
        }
      },
      {
        type: 'value',
        name: 'Счета',
        position: 'right',
        axisLabel: {
          formatter: '{value} шт'
        }
      }
    ],
    series: [
      {
        name: 'Продажи (руб)',
        type: 'bar',
        yAxisIndex: 0,
        data: salesData,
        itemStyle: {
          color: '#3b82f6'
        }
      },
      {
        name: 'Количество счетов',
        type: 'line',
        yAxisIndex: 1,
        data: requestsData,
        itemStyle: {
          color: '#ef4444'
        },
        lineStyle: {
          color: '#ef4444'
        }
      }
    ]
  }
}

// График по странам
export const getCountriesChart = (requests: UonRequest[] = []) => {
  const countryCounts = requests.reduce((acc, request) => {
    const country = request.country || 'Не указано'
    acc[country] = (acc[country] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    title: {
      text: 'Популярные направления',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: Object.keys(countryCounts),
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: {
      type: 'value',
      name: 'Количество заявок'
    },
    series: [
      {
        name: 'Заявки',
        type: 'bar',
        data: Object.values(countryCounts),
        itemStyle: {
          color: '#10b981'
        }
      }
    ]
  }
}

// График конверсии лидов
export const getLeadsConversionChart = (leads: UonLead[] = []) => {
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusLabels = {
    'new': 'Новые',
    'contacted': 'Связались',
    'qualified': 'Квалифицированы',
    'converted': 'Конвертированы',
    'lost': 'Потеряны'
  }

  const funnelData = Object.entries(statusCounts).map(([status, count]) => ({
    value: count,
    name: statusLabels[status as keyof typeof statusLabels] || status
  }))

  return {
    title: {
      text: 'Воронка конверсии лидов',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    series: [
      {
        name: 'Лиды',
        type: 'funnel',
        left: '10%',
        top: 60,
        bottom: 60,
        width: '80%',
        min: 0,
        max: Math.max(...Object.values(statusCounts), 1),
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside'
        },
        labelLine: {
          length: 10,
          lineStyle: {
            width: 1,
            type: 'solid'
          }
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        },
        emphasis: {
          label: {
            fontSize: 20
          }
        },
        data: funnelData
      }
    ]
  }
}

// График производительности менеджеров
export const getManagersPerformanceChart = (managers: UonManager[] = []) => {
  return {
    title: {
      text: 'Производительность менеджеров',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['Активные заявки', 'Завершенные заявки', 'Общие продажи'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: managers.map(m => {
        const nameParts = m.name.split(' ')
        return nameParts[0] + ' ' + (nameParts[1] ? nameParts[1].charAt(0) + '.' : '')
      }),
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Количество заявок',
        position: 'left'
      },
      {
        type: 'value',
        name: 'Продажи (млн руб)',
        position: 'right',
        axisLabel: {
          formatter: '{value} млн'
        }
      }
    ],
    series: [
      {
        name: 'Активные заявки',
        type: 'bar',
        yAxisIndex: 0,
        data: managers.map(m => m.active_requests || 0),
        itemStyle: {
          color: '#f59e0b'
        }
      },
      {
        name: 'Завершенные заявки',
        type: 'bar',
        yAxisIndex: 0,
        data: managers.map(m => m.completed_requests || 0),
        itemStyle: {
          color: '#10b981'
        }
      },
      {
        name: 'Общие продажи',
        type: 'line',
        yAxisIndex: 1,
        data: managers.map(m => ((m.total_sales || 0) / 1000000).toFixed(1)),
        itemStyle: {
          color: '#8b5cf6'
        },
        lineStyle: {
          color: '#8b5cf6'
        }
      }
    ]
  }
}