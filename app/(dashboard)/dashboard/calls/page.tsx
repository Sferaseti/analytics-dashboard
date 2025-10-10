'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, User, Calendar, Search, Filter, Download } from 'lucide-react'
import { UonApiClient, UonCall } from '@/lib/api/uon-client'

export default function CallsPage() {
  const [calls, setCalls] = useState<UonCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadCalls()
  }, [currentPage])

  const loadCalls = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Используем новый API endpoint для получения данных из БД
      const response = await fetch(`/api/uon/call-history?page=${currentPage}&limit=50`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Неизвестная ошибка API')
      }
      
      setCalls(Array.isArray(data.data) ? data.data : [])
      setTotalPages(data.pagination?.total_pages || 1)
    } catch (err) {
      console.error('Ошибка загрузки звонков:', err)
      setError('Не удалось загрузить данные о звонках')
    } finally {
      setLoading(false)
    }
  }

  const filteredCalls = Array.isArray(calls) ? calls.filter(call => {
    const matchesSearch = call.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (call.notes && call.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter
    const matchesDirection = directionFilter === 'all' || call.direction === directionFilter
    
    return matchesSearch && matchesStatus && matchesDirection
  }) : []

  const getStatusBadge = (status: string) => {
    const variants = {
      answered: 'default',
      missed: 'destructive',
      busy: 'secondary',
      failed: 'destructive'
    } as const
    
    const labels = {
      answered: 'Отвечен',
      missed: 'Пропущен',
      busy: 'Занято',
      failed: 'Неудачный'
    }
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getDirectionIcon = (direction: string) => {
    return direction === 'incoming' ? (
      <PhoneIncoming className="h-4 w-4 text-green-600" />
    ) : (
      <PhoneOutgoing className="h-4 w-4 text-blue-600" />
    )
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0 сек'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}м ${remainingSeconds}с` : `${remainingSeconds}с`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const callStats = {
    total: calls.length,
    answered: calls.filter(c => c.status === 'answered').length,
    missed: calls.filter(c => c.status === 'missed').length,
    incoming: calls.filter(c => c.direction === 'incoming').length,
    outgoing: calls.filter(c => c.direction === 'outgoing').length,
    totalDuration: calls.reduce((sum, c) => sum + c.duration, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">История звонков</h1>
          <p className="text-muted-foreground">
            Управление и анализ телефонных звонков
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCalls}>
            <Phone className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего звонков</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{callStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Отвеченные</CardTitle>
            <PhoneIncoming className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{callStats.answered}</div>
            <p className="text-xs text-muted-foreground">
              {callStats.total > 0 ? Math.round((callStats.answered / callStats.total) * 100) : 0}% от общего числа
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пропущенные</CardTitle>
            <Phone className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{callStats.missed}</div>
            <p className="text-xs text-muted-foreground">
              {callStats.total > 0 ? Math.round((callStats.missed / callStats.total) * 100) : 0}% от общего числа
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общее время</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(callStats.totalDuration)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по номеру или заметкам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="answered">Отвеченные</SelectItem>
                <SelectItem value="missed">Пропущенные</SelectItem>
                <SelectItem value="busy">Занято</SelectItem>
                <SelectItem value="failed">Неудачные</SelectItem>
              </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Направление" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все направления</SelectItem>
                <SelectItem value="incoming">Входящие</SelectItem>
                <SelectItem value="outgoing">Исходящие</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Список звонков */}
      <Card>
        <CardHeader>
          <CardTitle>Список звонков</CardTitle>
          <CardDescription>
            Показано {filteredCalls.length} из {calls.length} звонков
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 mb-4 p-3 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {filteredCalls.map((call) => (
              <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getDirectionIcon(call.direction)}
                    <span className="font-medium">{call.phone}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(call.status)}
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(call.duration)}
                    </Badge>
                  </div>
                  
                  {call.notes && (
                    <span className="text-sm text-muted-foreground max-w-xs truncate">
                      {call.notes}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(call.call_date)}</span>
                  </div>
                  
                  {call.manager_id && (
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>Менеджер {call.manager_id}</span>
                    </div>
                  )}
                  
                  {call.recording_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={call.recording_url} target="_blank" rel="noopener noreferrer">
                        Запись
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredCalls.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {calls.length === 0 ? 'Нет данных о звонках' : 'Нет звонков, соответствующих фильтрам'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}