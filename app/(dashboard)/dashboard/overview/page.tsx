'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner, LoadingCard } from '@/components/ui/loading-spinner'
import { ErrorCard } from '@/components/ui/error-card'
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
  Plane,
  Globe,
  BarChart3,
  Settings,
  Database
} from 'lucide-react'
import Link from 'next/link'
import { useTouristCache, touristCache } from '@/lib/cache/tourist-cache'
import { TouristCacheData, CacheStats } from '@/lib/cache/tourist-cache'
import { UonTourist, UonRequest, UonBill, UonClient, UonLead } from '@/lib/api/uon-client'
import { clientDataService } from '@/lib/api/client-data-service'

export default function DashboardOverview() {
  const [touristData, setTouristData] = useState<TouristCacheData | null>(null)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [realData, setRealData] = useState<{
    requests: UonRequest[]
    bills: UonBill[]
    clients: UonClient[]
    leads: UonLead[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRealData = useCallback(async () => {
    try {
      const data = await clientDataService.getAllData()
      setRealData(data)
    } catch (err) {
      console.error('Ошибка загрузки реальных данных:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    }
  }, [])

  const loadTouristData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await touristCache.getTourists()
      const stats = touristCache.getStats()
      
      setTouristData(prevData => {
        if (JSON.stringify(prevData) !== JSON.stringify(data)) {
          return data
        }
        return prevData
      })
      
      setCacheStats(prevStats => {
        if (JSON.stringify(prevStats) !== JSON.stringify(stats)) {
          return stats
        }
        return prevStats
      })
      
    } catch (err) {
      console.error('Ошибка загрузки данных туристов:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTouristData()
    loadRealData()
    
    const unsubscribe = touristCache.subscribe((data: TouristCacheData) => {
      setTouristData(prevData => {
        if (JSON.stringify(prevData) !== JSON.stringify(data)) {
          return data
        }
        return prevData
      })
      
      setCacheStats(prevStats => {
        const newStats = touristCache.getStats()
        if (JSON.stringify(prevStats) !== JSON.stringify(newStats)) {
          return newStats
        }
        return prevStats
      })
    })

    return unsubscribe
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Получаем API ключ команды для обновления кэша туристов
      const teamResponse = await fetch('/api/teams/uon-key')
      const teamData = await teamResponse.json()
      
      const promises = [loadRealData()]
      
      // Обновляем кэш туристов только если есть API ключ
      if (teamResponse.ok && teamData.hasKey && teamData.apiKey) {
        promises.push(touristCache.forceUpdate(teamData.apiKey))
      }
      
      await Promise.all(promises)
    } catch (error) {
      console.error('Ошибка обновления:', error)
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [loadRealData])

  // Вычисляем основные метрики из реальных данных
  const requests = realData?.requests || []
  const bills = realData?.bills || []
  const clients = realData?.clients || []
  const leads = realData?.leads || []

  const totalRequests = requests.length
  const confirmedRequests = requests.filter(r => r.status === 'confirmed').length
  const totalRevenue = requests.reduce((sum, r) => sum + (r.total_amount || 0), 0)
  const totalClients = clients.length
  const activeLeads = leads.filter(l => l.status !== 'lost').length

  // Метрики туристов
  const totalTourists = touristData?.tourists.length || 0
  const activeTourists = touristData?.tourists.filter((t: UonTourist) => t.status === 'active').length || 0
  const inactiveTourists = totalTourists - activeTourists

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Обзор дашборда</h1>
          <p className="text-muted-foreground">
            Основные метрики и аналитика U-ON.RU
          </p>
        </div>
        <ErrorCard 
          title="Ошибка загрузки данных"
          description={error}
          onRetry={handleRefresh}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Обзор дашборда</h1>
          <p className="text-muted-foreground">
            Основные метрики и аналитика U-ON.RU
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Основные метрики */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalRequests}</div>
                <p className="text-xs text-muted-foreground">
                  {confirmedRequests} подтверждено
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общий доход</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">₽{totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +{((confirmedRequests / Math.max(totalRequests, 1)) * 100).toFixed(1)}% конверсия
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Клиенты</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  {totalTourists} туристов
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные лиды</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeLeads}</div>
                <p className="text-xs text-muted-foreground">
                  из {leads.length} общих
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Детальная информация */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Статистика туристов */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Туристы
            </CardTitle>
            <CardDescription>
              Статистика по базе туристов
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Всего туристов</span>
                  <Badge variant="secondary">{totalTourists}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Активные</span>
                  <Badge variant="default">{activeTourists}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Неактивные</span>
                  <Badge variant="outline">{inactiveTourists}</Badge>
                </div>
                {cacheStats && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Обновлено: {new Date(cacheStats.lastUpdated).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Быстрые действия */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Быстрые действия
            </CardTitle>
            <CardDescription>
              Часто используемые функции
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/requests">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Управление заявками
                </Button>
              </Link>
              <Link href="/dashboard/clients">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  База клиентов
                </Button>
              </Link>
              <Link href="/dashboard/reports">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Отчеты и аналитика
                </Button>
              </Link>
              <Link href="/dashboard/api-settings">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Настройки API
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Системная информация */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Система
            </CardTitle>
            <CardDescription>
              Информация о состоянии системы
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Статус API</span>
                <Badge variant="default">Подключено</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Кэш туристов</span>
                <Badge variant={cacheStats?.cacheHit ? "default" : "secondary"}>
                  {cacheStats?.cacheHit ? "Актуален" : "Обновляется"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Синхронизация</span>
                <Badge variant="outline">Автоматическая</Badge>
              </div>
              {cacheStats && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Следующее обновление: {new Date(cacheStats.nextUpdate).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}