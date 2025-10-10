'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  Eye,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Clock
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorCard } from '@/components/ui/error-card'
import { UonRequest } from '@/lib/api/uon-client'

interface RequestsPageState {
  requests: UonRequest[]
  filteredRequests: UonRequest[]
  isLoading: boolean
  error: string | null
  searchTerm: string
  statusFilter: string
  countryFilter: string
  dateFilter: string
  currentPage: number
  itemsPerPage: number
}

const statusLabels: Record<string, string> = {
  'new': 'Новая',
  'confirmed': 'Подтверждена',
  'in_progress': 'В работе',
  'completed': 'Завершена',
  'cancelled': 'Отменена',
  'pending': 'Ожидает'
}

const statusColors: Record<string, string> = {
  'new': 'bg-blue-100 text-blue-800',
  'confirmed': 'bg-green-100 text-green-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'completed': 'bg-emerald-100 text-emerald-800',
  'cancelled': 'bg-red-100 text-red-800',
  'pending': 'bg-gray-100 text-gray-800'
}

export default function RequestsPage() {
  const [state, setState] = useState<RequestsPageState>({
    requests: [],
    filteredRequests: [],
    isLoading: true,
    error: null,
    searchTerm: '',
    statusFilter: 'all',
    countryFilter: 'all',
    dateFilter: 'all',
    currentPage: 1,
    itemsPerPage: 20
  })

  // Загрузка заявок
  const fetchRequests = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const response = await fetch('/api/uon/requests?limit=1000')
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Обработка ошибки API
      if (!data.success) {
        throw new Error(data.error || 'Ошибка получения данных')
      }
      
      const requests = Array.isArray(data.data) ? data.data : []
      
      setState(prev => ({
        ...prev,
        requests,
        filteredRequests: requests,
        isLoading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        isLoading: false
      }))
    }
  }

  // Фильтрация заявок
  const applyFilters = () => {
    // Проверяем, что requests является массивом
    if (!Array.isArray(state.requests)) {
      console.warn('state.requests is not an array:', state.requests)
      return
    }

    let filtered = [...state.requests]

    // Поиск по тексту
    if (state.searchTerm) {
      const searchLower = state.searchTerm.toLowerCase()
      filtered = filtered.filter(request => 
        request.country?.toLowerCase().includes(searchLower) ||
        request.name?.toLowerCase().includes(searchLower) ||
        request.id?.toString().includes(searchLower)
      )
    }

    // Фильтр по статусу
    if (state.statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === state.statusFilter)
    }

    // Фильтр по стране
    if (state.countryFilter !== 'all') {
      filtered = filtered.filter(request => request.country === state.countryFilter)
    }

    // Фильтр по дате
    if (state.dateFilter !== 'all') {
      const today = new Date()
      const filterDate = new Date()
      
      switch (state.dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter(request => {
            const requestDate = new Date(request.created_at)
            return requestDate >= filterDate
          })
          break
        case 'week':
          filterDate.setDate(today.getDate() - 7)
          filtered = filtered.filter(request => {
            const requestDate = new Date(request.created_at)
            return requestDate >= filterDate
          })
          break
        case 'month':
          filterDate.setMonth(today.getMonth() - 1)
          filtered = filtered.filter(request => {
            const requestDate = new Date(request.created_at)
            return requestDate >= filterDate
          })
          break
      }
    }

    setState(prev => ({
      ...prev,
      filteredRequests: filtered,
      currentPage: 1
    }))
  }

  // Получение уникальных стран
  const getUniqueCountries = () => {
    const countries = state.requests
      .map(request => request.country)
      .filter(Boolean)
      .filter((country, index, arr) => arr.indexOf(country) === index)
      .sort()
    return countries
  }

  // Пагинация
  const getPaginatedRequests = () => {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage
    const endIndex = startIndex + state.itemsPerPage
    return state.filteredRequests.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(state.filteredRequests.length / state.itemsPerPage)

  // Обработчики событий
  const handleSearchChange = (value: string) => {
    setState(prev => ({ ...prev, searchTerm: value }))
  }

  const handleStatusFilterChange = (value: string) => {
    setState(prev => ({ ...prev, statusFilter: value }))
  }

  const handleCountryFilterChange = (value: string) => {
    setState(prev => ({ ...prev, countryFilter: value }))
  }

  const handleDateFilterChange = (value: string) => {
    setState(prev => ({ ...prev, dateFilter: value }))
  }

  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }

  // Эффекты
  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [state.searchTerm, state.statusFilter, state.countryFilter, state.dateFilter, state.requests])

  // Вспомогательные функции
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return '-'
    return `${amount.toLocaleString('ru-RU')} ₽`
  }

  if (state.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Реестр заявок</h1>
          <p className="text-muted-foreground">
            Управление заявками туристов
          </p>
        </div>
        <ErrorCard 
          title="Ошибка загрузки заявок"
          description={state.error}
          onRetry={fetchRequests}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Реестр заявок</h1>
          <p className="text-muted-foreground">
            Управление заявками туристов ({state.filteredRequests.length} из {state.requests.length})
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRequests} disabled={state.isLoading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${state.isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заявок</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.requests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Подтверждено</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {state.requests.filter(r => r.status === 'confirmed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">В работе</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {state.requests.filter(r => r.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая сумма</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(state.requests.reduce((sum, r) => sum + (r.total_amount || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Фильтры и поиск
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Поиск</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по стране, клиенту, ID..."
                  value={state.searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={state.statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Страна</Label>
              <Select value={state.countryFilter} onValueChange={handleCountryFilterChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все страны</SelectItem>
                  {getUniqueCountries().map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Период</Label>
              <Select value={state.dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все время</SelectItem>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="week">Неделя</SelectItem>
                  <SelectItem value="month">Месяц</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица заявок */}
      <Card>
        <CardHeader>
          <CardTitle>Список заявок</CardTitle>
          <CardDescription>
            Показано {getPaginatedRequests().length} из {state.filteredRequests.length} заявок
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Страна</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Сумма</TableHead>
                    <TableHead>Дата создания</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPaginatedRequests().map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">#{request.id}</TableCell>
                      <TableCell>{request.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {request.country || 'Не указана'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={statusColors[request.status] || 'bg-gray-100 text-gray-800'}
                        >
                          {statusLabels[request.status] || request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatAmount(request.total_amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(request.created_at)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Страница {state.currentPage} из {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(state.currentPage - 1)}
                      disabled={state.currentPage === 1}
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(state.currentPage + 1)}
                      disabled={state.currentPage === totalPages}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}