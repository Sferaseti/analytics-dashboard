'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import EChartsWrapper from '@/components/charts/echarts-wrapper'
import {
  getRequestsStatusChart,
  getSalesChart,
  getCountriesChart,
  getLeadsConversionChart,
  getManagersPerformanceChart
} from '@/lib/charts/chart-utils'
import { useTouristCache } from '@/lib/cache/tourist-cache'
import { clientDataService } from '@/lib/api/client-data-service'
import { 
  Users, 
  FileText, 
  CreditCard, 
  UserCheck, 
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  RefreshCw,
  Clock,
  Activity,
  Plus
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { TouristCacheData, CacheStats } from '@/lib/cache/tourist-cache'
import { UonRequest, UonBill, UonClient, UonLead, UonManager } from '@/lib/api/uon-client'

export default function ReportsPage() {
  const touristCache = useTouristCache()
  const [touristData, setTouristData] = useState<TouristCacheData | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [realData, setRealData] = useState<{
    requests: UonRequest[]
    bills: UonBill[]
    clients: UonClient[]
    leads: UonLead[]
    managers: UonManager[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadRealData = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await clientDataService.getAllData()
      setRealData(data)
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadTouristData = useCallback(async () => {
    try {
      const data = await touristCache.getTourists()
      const stats = touristCache.getStats()
      setTouristData(data)
      setCacheStats(stats)
    } catch (error) {
      console.error('Ошибка при загрузке данных туристов:', error)
    }
  }, [touristCache])

  useEffect(() => {
    loadRealData()
    loadTouristData()
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Получаем API ключ команды для обновления кэша туристов
      const teamResponse = await fetch('/api/teams/uon-key')
      const teamData = await teamResponse.json()
      
      // Обновляем кэш туристов только если есть API ключ
      if (teamResponse.ok && teamData.hasKey && teamData.apiKey) {
        await touristCache.forceUpdate(teamData.apiKey)
      }
      
      await loadRealData()
      await loadTouristData()
    } catch (error) {
      console.error('Ошибка обновления данных:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [touristCache, loadRealData, loadTouristData])

  if (isLoading || !realData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Загрузка данных...</p>
        </div>
      </div>
    )
  }

  const { requests, bills, clients, leads, managers } = realData

  // Расчет ключевых метрик
  const totalRequests = requests.length
  const confirmedRequests = requests.filter(r => r.status === 'confirmed').length
  const totalRevenue = bills.reduce((sum, b) => sum + b.amount, 0)
  const paidBills = bills.filter(b => b.status === 'paid').length
  const totalClients = clients.length
  const activeLeads = leads.filter(l => l.status === 'new' || l.status === 'contacted').length

  // Данные для туристов
  const totalTourists = touristData?.tourists?.length || 0
  const activeTourists = touristData?.tourists?.filter(t => t.status === 'active').length || 0
  const inactiveTourists = totalTourists - activeTourists

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Отчеты</h1>
          <p className="text-muted-foreground">
            Аналитика и статистика по всем направлениям деятельности
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports/create">
            <Button variant="default">
              <Plus className="h-4 w-4 mr-2" />
              Создать отчет
            </Button>
          </Link>
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить данные
          </Button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              Подтверждено: {confirmedRequests}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString('ru-RU')} ₽
            </div>
            <p className="text-xs text-muted-foreground">
              Оплачено счетов: {paidBills}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Клиенты</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Всего в базе
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные лиды</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLeads}</div>
            <p className="text-xs text-muted-foreground">
              Из {leads.length} общих
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Заявки</TabsTrigger>
          <TabsTrigger value="sales">Продажи</TabsTrigger>
          <TabsTrigger value="clients">Клиенты</TabsTrigger>
          <TabsTrigger value="leads">Лиды</TabsTrigger>
          <TabsTrigger value="managers">Менеджеры</TabsTrigger>
          <TabsTrigger value="tourists">Туристы</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Статус заявок</CardTitle>
                <CardDescription>
                  Распределение заявок по статусам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EChartsWrapper 
                  option={getRequestsStatusChart(requests)} 
                  style={{ height: '300px', width: '100%' }} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Заявки по странам</CardTitle>
                <CardDescription>
                  Популярные направления
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EChartsWrapper 
                  option={getCountriesChart(requests)} 
                  style={{ height: '300px', width: '100%' }} 
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Последние заявки</CardTitle>
              <CardDescription>
                Список последних поступивших заявок
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.slice(0, 5).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{request.country}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.adults} взр. + {request.children} дет.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{request.total_amount.toLocaleString('ru-RU')} ₽</p>
                      <p className="text-sm text-muted-foreground">{request.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Динамика продаж</CardTitle>
              <CardDescription>
                Выручка по месяцам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EChartsWrapper 
                  option={getSalesChart(bills)} 
                  style={{ height: '300px', width: '100%' }} 
                />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Клиенты</CardTitle>
              <CardDescription>
                Информация о клиентах
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {clients.slice(0, 10).map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{client.total_spent.toLocaleString('ru-RU')} ₽</p>
                      <p className="text-sm text-muted-foreground">{client.requests_count} заявок</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Конверсия лидов</CardTitle>
                <CardDescription>
                  Воронка продаж
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EChartsWrapper 
                  option={getLeadsConversionChart(leads)} 
                  style={{ height: '300px', width: '100%' }} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Активные лиды</CardTitle>
                <CardDescription>
                  Лиды в работе
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leads.filter(lead => lead.status === 'new' || lead.status === 'contacted').slice(0, 5).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.country_interest}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{lead.budget.toLocaleString('ru-RU')} ₽</p>
                        <p className="text-sm text-muted-foreground">{lead.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Производительность менеджеров</CardTitle>
                <CardDescription>
                  Сравнение результатов работы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EChartsWrapper 
                  option={getManagersPerformanceChart(managers)} 
                  style={{ height: '300px', width: '100%' }} 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Топ менеджеры</CardTitle>
                <CardDescription>
                  Лучшие результаты по продажам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {managers
                    .sort((a, b) => b.total_sales - a.total_sales)
                    .slice(0, 5)
                    .map((manager) => (
                    <div key={manager.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{manager.name}</p>
                        <p className="text-sm text-muted-foreground">{manager.department || 'Не указан'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{manager.total_sales.toLocaleString('ru-RU')} ₽</p>
                        <p className="text-sm text-muted-foreground">
                          {manager.completed_requests} завершенных заявок
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tourists" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего туристов</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTourists}</div>
                <p className="text-xs text-muted-foreground">
                  В кэше системы
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активные</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeTourists}</div>
                <p className="text-xs text-muted-foreground">
                  Активных туристов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Неактивные</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inactiveTourists}</div>
                <p className="text-xs text-muted-foreground">
                  Неактивных туристов
                </p>
              </CardContent>
            </Card>
          </div>

          {cacheStats && (
            <Card>
              <CardHeader>
                <CardTitle>Статистика кэша туристов</CardTitle>
                <CardDescription>
                  Информация о состоянии кэша
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Всего туристов</p>
                    <p className="text-2xl font-bold">{cacheStats.totalTourists}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Активных</p>
                    <p className="text-2xl font-bold">{cacheStats.activeTourists}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Последнее обновление</p>
                    <p className="text-sm">{new Date(cacheStats.lastUpdated).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Статус кэша</p>
                    <p className="text-sm">{cacheStats.cacheHit ? 'Актуален' : 'Обновляется'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}