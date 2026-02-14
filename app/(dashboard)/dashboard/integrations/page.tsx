'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Link2,
  Unlink,
  ArrowRight,
  Settings,
  BarChart3,
  Clock,
  Users,
  FileText,
  Phone,
  TrendingUp,
} from 'lucide-react';

interface AmoCrmSettings {
  id: number;
  subdomain: string;
  clientId: string;
  redirectUri: string;
  isActive: boolean;
  syncEnabled: boolean;
  syncInterval: number;
  lastSyncAt: string | null;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  expiresAt: string | null;
}

interface SyncConfig {
  id: number;
  entityType: string;
  direction: string;
  isEnabled: boolean;
  pipelineId: number | null;
  createIfNotExists: boolean;
  updateExisting: boolean;
}

interface Pipeline {
  id: number;
  name: string;
  is_main: boolean;
  _embedded?: {
    statuses: Array<{ id: number; name: string; color: string }>;
  };
}

interface SyncStats {
  lastSyncAt: string | null;
  isActive: boolean;
  syncEnabled: boolean;
  syncInterval: number;
  totalMappings: number;
  mappingsByType: Record<string, number>;
  syncStats: {
    total: number;
    successful: number;
    failed: number;
  };
  recentLogs: Array<{
    id: number;
    entityType: string;
    direction: string;
    status: string;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsFailed: number;
    startedAt: string;
    duration: number | null;
  }>;
}

const entityTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  tourists: { label: 'Туристы -> Контакты', icon: <Users className="h-4 w-4" /> },
  requests: { label: 'Заявки -> Сделки', icon: <FileText className="h-4 w-4" /> },
  leads: { label: 'Лиды -> Сделки', icon: <TrendingUp className="h-4 w-4" /> },
  calls: { label: 'Звонки -> Примечания', icon: <Phone className="h-4 w-4" /> },
};

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState<AmoCrmSettings | null>(null);
  const [configs, setConfigs] = useState<SyncConfig[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Форма настроек
  const [formData, setFormData] = useState({
    subdomain: '',
    clientId: '',
    clientSecret: '',
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/api/amocrm/oauth/callback` : '',
    syncEnabled: false,
    syncInterval: 30,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Проверяем параметры URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');

      if (success) {
        setMessage(success);
        setMessageType('success');
        // Очищаем URL
        window.history.replaceState({}, '', window.location.pathname);
        loadData();
      } else if (error) {
        setMessage(error);
        setMessageType('error');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, configsRes, statsRes] = await Promise.all([
        fetch('/api/amocrm/settings'),
        fetch('/api/amocrm/config'),
        fetch('/api/amocrm/stats'),
      ]);

      const settingsData = await settingsRes.json();
      const configsData = await configsRes.json();
      const statsData = await statsRes.json();

      if (settingsData.configured && settingsData.settings) {
        setSettings(settingsData.settings);
        setFormData({
          subdomain: settingsData.settings.subdomain || '',
          clientId: settingsData.settings.clientId || '',
          clientSecret: '',
          redirectUri: settingsData.settings.redirectUri || `${window.location.origin}/api/amocrm/oauth/callback`,
          syncEnabled: settingsData.settings.syncEnabled || false,
          syncInterval: settingsData.settings.syncInterval || 30,
        });

        // Загружаем воронки, если есть активный токен
        if (settingsData.settings.isActive) {
          loadPipelines();
        }
      }

      if (configsData.success) {
        setConfigs(configsData.configs);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPipelines = async () => {
    try {
      const res = await fetch('/api/amocrm/pipelines');
      const data = await res.json();
      if (data.success) {
        setPipelines(data.pipelines || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки воронок:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!formData.subdomain || !formData.clientId || !formData.clientSecret) {
      setMessage('Заполните все обязательные поля');
      setMessageType('error');
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/amocrm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('Настройки сохранены. Перенаправляем на авторизацию в amoCRM...');
        setMessageType('success');

        // Редирект на авторизацию
        if (data.authUrl) {
          setTimeout(() => {
            window.location.href = data.authUrl;
          }, 1500);
        }
      } else {
        setMessage(data.error || 'Ошибка сохранения настроек');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка сохранения настроек');
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Вы уверены? Это удалит все настройки интеграции и данные синхронизации.')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/amocrm/settings', { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        setMessage('Интеграция отключена');
        setMessageType('success');
        setSettings(null);
        setConfigs([]);
        setStats(null);
      } else {
        setMessage(data.error || 'Ошибка отключения');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка отключения интеграции');
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async (entityType?: string) => {
    setIsSyncing(true);
    setMessage('');

    try {
      const res = await fetch('/api/amocrm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(data.message || 'Синхронизация завершена');
        setMessageType('success');
        loadData();
      } else {
        setMessage(data.error || 'Ошибка синхронизации');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка синхронизации');
      setMessageType('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfigChange = async (entityType: string, field: string, value: any) => {
    const updatedConfigs = configs.map((c) =>
      c.entityType === entityType ? { ...c, [field]: value } : c
    );
    setConfigs(updatedConfigs);

    try {
      await fetch('/api/amocrm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, [field]: value }),
      });
    } catch (error) {
      console.error('Ошибка сохранения конфигурации:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Интеграции</h1>
          <p className="text-muted-foreground mt-2">
            Настройка синхронизации данных между U-ON и amoCRM
          </p>
        </div>
        {settings?.isActive && (
          <Button onClick={() => handleSync()} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Синхронизировать все
          </Button>
        )}
      </div>

      {message && (
        <Alert className={messageType === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <div className="flex items-center space-x-2">
            {messageType === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={messageType === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Статус подключения */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">A</span>
              </div>
              <div>
                <CardTitle>amoCRM</CardTitle>
                <CardDescription>Синхронизация данных с amoCRM</CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {settings?.isActive ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Подключено
                </Badge>
              ) : settings ? (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  Ожидает авторизации
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Unlink className="h-3 w-3 mr-1" />
                  Не настроено
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Настройки
          </TabsTrigger>
          <TabsTrigger value="sync" disabled={!settings?.isActive}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Синхронизация
          </TabsTrigger>
          <TabsTrigger value="stats" disabled={!settings?.isActive}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Статистика
          </TabsTrigger>
        </TabsList>

        {/* Вкладка настроек */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Подключение к amoCRM</CardTitle>
              <CardDescription>
                Для подключения вам потребуется создать интеграцию в вашем аккаунте amoCRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Субдомен *</label>
                  <div className="flex items-center">
                    <Input
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      placeholder="example"
                    />
                    <span className="ml-2 text-muted-foreground">.amocrm.ru</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Client ID *</label>
                  <Input
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="ID интеграции"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Secret *</label>
                  <Input
                    type="password"
                    value={formData.clientSecret}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    placeholder="Секретный ключ интеграции"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Redirect URI</label>
                  <Input
                    value={formData.redirectUri}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Укажите этот URL в настройках интеграции amoCRM
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.syncEnabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, syncEnabled: checked })}
                    />
                    <label className="text-sm">Автосинхронизация</label>
                  </div>

                  {formData.syncEnabled && (
                    <Select
                      value={String(formData.syncInterval)}
                      onValueChange={(value) => setFormData({ ...formData, syncInterval: parseInt(value) })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 мин</SelectItem>
                        <SelectItem value="30">30 мин</SelectItem>
                        <SelectItem value="60">1 час</SelectItem>
                        <SelectItem value="120">2 часа</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex space-x-2">
                  {settings?.isActive && (
                    <Button variant="destructive" onClick={handleDisconnect} disabled={isSaving}>
                      <Unlink className="h-4 w-4 mr-2" />
                      Отключить
                    </Button>
                  )}
                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    {settings ? 'Переподключить' : 'Подключить'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Инструкция по настройке</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Войдите в свой аккаунт amoCRM</li>
                <li>Перейдите в Настройки → Интеграции</li>
                <li>Нажмите "Создать интеграцию"</li>
                <li>Заполните название и описание интеграции</li>
                <li>В поле "Redirect URI" вставьте: <code className="bg-muted px-1 rounded">{formData.redirectUri}</code></li>
                <li>Скопируйте Client ID и Client Secret</li>
                <li>Вставьте их в форму выше и нажмите "Подключить"</li>
                <li>Авторизуйте интеграцию в открывшемся окне amoCRM</li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка синхронизации */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройка синхронизации</CardTitle>
              <CardDescription>
                Выберите, какие данные синхронизировать из U-ON в amoCRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configs.map((config) => (
                <div
                  key={config.entityType}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {entityTypeLabels[config.entityType]?.icon}
                    </div>
                    <div>
                      <p className="font-medium">{entityTypeLabels[config.entityType]?.label}</p>
                      <p className="text-sm text-muted-foreground">
                        U-ON <ArrowRight className="h-3 w-3 inline mx-1" /> amoCRM
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {config.entityType === 'requests' && pipelines.length > 0 && (
                      <Select
                        value={String(config.pipelineId || '')}
                        onValueChange={(value) =>
                          handleConfigChange(config.entityType, 'pipelineId', value ? parseInt(value) : null)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Воронка" />
                        </SelectTrigger>
                        <SelectContent>
                          {pipelines.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Switch
                      checked={config.isEnabled}
                      onCheckedChange={(checked) =>
                        handleConfigChange(config.entityType, 'isEnabled', checked)
                      }
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(config.entityType)}
                      disabled={isSyncing || !config.isEnabled}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка статистики */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Всего связей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMappings || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Успешных синхронизаций</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.syncStats.successful || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Ошибок</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.syncStats.failed || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Последняя синхронизация</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {stats?.lastSyncAt
                    ? new Date(stats.lastSyncAt).toLocaleString('ru')
                    : 'Никогда'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Связи по типам */}
          {stats?.mappingsByType && Object.keys(stats.mappingsByType).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Связи по типам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats.mappingsByType).map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{key}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* История синхронизаций */}
          <Card>
            <CardHeader>
              <CardTitle>История синхронизаций</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {stats.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {log.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : log.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {entityTypeLabels[log.entityType]?.label || log.entityType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.startedAt).toLocaleString('ru')}
                            {log.duration && ` • ${log.duration}с`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>
                          <span className="text-green-600">+{log.recordsCreated}</span>
                          {' / '}
                          <span className="text-blue-600">{log.recordsUpdated}</span>
                          {log.recordsFailed > 0 && (
                            <>
                              {' / '}
                              <span className="text-red-600">{log.recordsFailed}</span>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Обработано: {log.recordsProcessed}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Нет истории синхронизаций
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
