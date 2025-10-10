'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, DollarSign, TrendingUp, Users, Save, Filter } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  provider: 'stripe' | 'yukassa';
  customerEmail: string;
  createdAt: string;
  description?: string;
}

export default function FinancePage() {
  const [shopId, setShopId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data for demonstration
  const mockPayments: Payment[] = [
    {
      id: 'pi_1234567890',
      amount: 2999,
      currency: 'RUB',
      status: 'succeeded',
      provider: 'stripe',
      customerEmail: 'user@example.com',
      createdAt: '2024-01-15T10:30:00Z',
      description: 'Pro Plan Subscription'
    },
    {
      id: 'yk_9876543210',
      amount: 1999,
      currency: 'RUB',
      status: 'succeeded',
      provider: 'yukassa',
      customerEmail: 'customer@test.com',
      createdAt: '2024-01-14T15:45:00Z',
      description: 'Basic Plan Subscription'
    },
    {
      id: 'pi_1111111111',
      amount: 4999,
      currency: 'RUB',
      status: 'pending',
      provider: 'stripe',
      customerEmail: 'pending@example.com',
      createdAt: '2024-01-13T09:15:00Z',
      description: 'Enterprise Plan Subscription'
    },
    {
      id: 'yk_2222222222',
      amount: 2999,
      currency: 'RUB',
      status: 'failed',
      provider: 'yukassa',
      customerEmail: 'failed@test.com',
      createdAt: '2024-01-12T14:20:00Z',
      description: 'Pro Plan Subscription'
    }
  ];

  useEffect(() => {
    // TODO: Load Yookassa settings from API
    // TODO: Load payment records from database
    setPayments(mockPayments);
    setFilteredPayments(mockPayments);
    setLoading(false);
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, filterProvider, filterStatus]);

  const filterPayments = () => {
    let filtered = payments;

    if (filterProvider !== 'all') {
      filtered = filtered.filter(payment => payment.provider === filterProvider);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(payment => payment.status === filterStatus);
    }

    setFilteredPayments(filtered);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Save settings to API
      console.log('Saving Yookassa settings:', { shopId, secretKey });
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Настройки сохранены успешно!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'canceled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'Успешно';
      case 'pending':
        return 'В обработке';
      case 'failed':
        return 'Неудачно';
      case 'canceled':
        return 'Отменено';
      default:
        return status;
    }
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return 'Stripe';
      case 'yukassa':
        return 'ЮKassa';
      default:
        return provider;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  // Calculate statistics
  const totalRevenue = payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalPayments = payments.length;
  const successfulPayments = payments.filter(p => p.status === 'succeeded').length;
  const successRate = totalPayments > 0 ? (successfulPayments / totalPayments * 100).toFixed(1) : '0';
  const activeSubscriptions = successfulPayments; // Simplified for demo

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Финансы</h1>
        <p className="text-muted-foreground">
          Управление платежами и настройки ЮKassa
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(totalRevenue, 'RUB')}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего платежей</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Успешность</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные подписки</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Yookassa Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Настройки ЮKassa
          </CardTitle>
          <CardDescription>
            Конфигурация интеграции с платежной системой ЮKassa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shopId">Shop ID</Label>
              <Input
                id="shopId"
                placeholder="Введите Shop ID"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input
                id="secretKey"
                type="password"
                placeholder="Введите Secret Key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSaveSettings}
            disabled={saving || !shopId || !secretKey}
            className="w-full md:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Records */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Реестр платежей</CardTitle>
              <CardDescription>
                История всех транзакций через Stripe и ЮKassa
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Провайдер" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все провайдеры</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="yukassa">ЮKassa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="succeeded">Успешно</SelectItem>
                  <SelectItem value="pending">В обработке</SelectItem>
                  <SelectItem value="failed">Неудачно</SelectItem>
                  <SelectItem value="canceled">Отменено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID платежа</TableHead>
                  <TableHead>Email клиента</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Провайдер</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Описание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.id}
                    </TableCell>
                    <TableCell>{payment.customerEmail}</TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.provider === 'stripe' ? 'default' : 'secondary'}>
                        {getProviderDisplayName(payment.provider)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(payment.status)}>
                        {getStatusDisplayName(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.description || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredPayments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="mx-auto h-8 w-8 mb-2" />
              <p>Платежи не найдены</p>
              <p className="text-sm">Попробуйте изменить фильтры</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}