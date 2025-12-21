'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Cloud,
  Database,
  Download,
  RefreshCw,
  HardDrive,
  Clock,
} from 'lucide-react';

interface YandexCloudSettings {
  configured: boolean;
  settings: {
    folderId: string | null;
    accessKeyId: string | null;
    hasSecretKey: boolean;
    bucket: string | null;
    hasOauthToken: boolean;
    autoBackup: boolean;
    backupFrequency: string | null;
    lastBackup: string | null;
  } | null;
}

interface ExportResult {
  entityType: string;
  recordsExported: number;
  fileKey: string;
  fileSize: number;
  exportedAt: string;
}

interface BackupInfo {
  id: number;
  backupId: string;
  status: string;
  recordsExported: number;
  fileSize: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

export default function YandexCloudPage() {
  // Settings state
  const [folderId, setFolderId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucket, setBucket] = useState('');
  const [oauthToken, setOauthToken] = useState('');
  const [autoBackup, setAutoBackup] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('daily');

  // UI state
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Data state
  const [exportHistory, setExportHistory] = useState<ExportResult[]>([]);
  const [backupHistory, setBackupHistory] = useState<BackupInfo[]>([]);
  const [testResults, setTestResults] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    loadSettings();
    loadExportHistory();
    loadBackupHistory();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const response = await fetch('/api/yandex-cloud/settings');
      const data: YandexCloudSettings = await response.json();

      if (response.ok && data.settings) {
        setConfigured(data.configured);
        if (data.settings.bucket) setBucket(data.settings.bucket);
        if (data.settings.folderId) setFolderId(data.settings.folderId);
        setAutoBackup(data.settings.autoBackup);
        if (data.settings.backupFrequency) setBackupFrequency(data.settings.backupFrequency);
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const loadExportHistory = async () => {
    try {
      const response = await fetch('/api/yandex-cloud/export');
      const data = await response.json();
      if (response.ok && data.exports) {
        setExportHistory(data.exports);
      }
    } catch (error) {
      console.error('Ошибка при загрузке истории экспорта:', error);
    }
  };

  const loadBackupHistory = async () => {
    try {
      const response = await fetch('/api/yandex-cloud/backup');
      const data = await response.json();
      if (response.ok && data.history) {
        setBackupHistory(data.history);
      }
    } catch (error) {
      console.error('Ошибка при загрузке истории бэкапов:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!accessKeyId.trim() || !secretAccessKey.trim() || !bucket.trim()) {
      setMessage('Заполните все обязательные поля');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/yandex-cloud/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folderId.trim() || null,
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
          bucket: bucket.trim(),
          oauthToken: oauthToken.trim() || null,
          autoBackup,
          backupFrequency,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Настройки успешно сохранены');
        setMessageType('success');
        setSecretAccessKey('');
        setOauthToken('');
        await loadSettings();
      } else {
        setMessage(data.error || 'Ошибка при сохранении настроек');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка при сохранении настроек');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResults(null);
    setMessage('');

    try {
      const response = await fetch('/api/yandex-cloud/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          accessKeyId && secretAccessKey && bucket
            ? { accessKeyId, secretAccessKey, bucket }
            : {}
        ),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResults(data.tests);
        setMessage('Подключение успешно');
        setMessageType('success');
      } else {
        setMessage(data.error || 'Ошибка подключения');
        setMessageType('error');
        setTestResults(data.tests || null);
      }
    } catch (error) {
      setMessage('Ошибка при тестировании подключения');
      setMessageType('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    setMessage('');

    try {
      const response = await fetch('/api/yandex-cloud/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(`Экспорт завершен: ${data.data.totalRecords} записей`);
        setMessageType('success');
        await loadExportHistory();
      } else {
        setMessage(data.error || 'Ошибка экспорта');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка при экспорте данных');
      setMessageType('error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setMessage('');

    try {
      const response = await fetch('/api/yandex-cloud/backup', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(`Бэкап создан: ${data.backup.totalRecords} записей`);
        setMessageType('success');
        await loadBackupHistory();
      } else {
        setMessage(data.error || 'Ошибка создания бэкапа');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка при создании бэкапа');
      setMessageType('error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRemoveSettings = async () => {
    if (!confirm('Вы уверены, что хотите удалить настройки Yandex Cloud?')) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/yandex-cloud/settings', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Настройки удалены');
        setMessageType('success');
        setConfigured(false);
        setBucket('');
        setFolderId('');
        setAutoBackup(false);
      } else {
        setMessage(data.error || 'Ошибка при удалении настроек');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка при удалении настроек');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cloud className="h-8 w-8" />
          Yandex Cloud
        </h1>
        <p className="text-muted-foreground mt-2">
          Интеграция с Yandex Cloud Object Storage для резервного копирования и экспорта данных
        </p>
      </div>

      {message && (
        <Alert
          className={
            messageType === 'error'
              ? 'border-red-200 bg-red-50'
              : 'border-green-200 bg-green-50'
          }
        >
          <div className="flex items-center space-x-2">
            {messageType === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={messageType === 'error' ? 'text-red-800' : 'text-green-800'}
            >
              {message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
          <TabsTrigger value="export" disabled={!configured}>
            Экспорт данных
          </TabsTrigger>
          <TabsTrigger value="backup" disabled={!configured}>
            Резервное копирование
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Object Storage
              </CardTitle>
              <CardDescription>
                Настройте подключение к Yandex Cloud Object Storage для хранения данных
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingSettings ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Загрузка настроек...</span>
                </div>
              ) : (
                <>
                  {configured && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Yandex Cloud настроен. Бакет: <strong>{bucket}</strong>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Folder ID (опционально)</label>
                      <Input
                        placeholder="b1g..."
                        value={folderId}
                        onChange={(e) => setFolderId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        ID папки в Yandex Cloud (можно найти в консоли)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Access Key ID *</label>
                      <Input
                        placeholder="YC..."
                        value={accessKeyId}
                        onChange={(e) => setAccessKeyId(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Secret Access Key *</label>
                      <div className="flex space-x-2">
                        <Input
                          type={showSecretKey ? 'text' : 'password'}
                          placeholder={configured ? '••••••••' : 'Введите секретный ключ'}
                          value={secretAccessKey}
                          onChange={(e) => setSecretAccessKey(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Название бакета *</label>
                      <Input
                        placeholder="my-analytics-bucket"
                        value={bucket}
                        onChange={(e) => setBucket(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Бакет должен быть предварительно создан в Yandex Cloud
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">OAuth Token (опционально)</label>
                      <Input
                        type="password"
                        placeholder="y0_..."
                        value={oauthToken}
                        onChange={(e) => setOauthToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Для доступа к другим сервисам Yandex Cloud (опционально)
                      </p>
                    </div>

                    <div className="flex items-center justify-between border rounded-lg p-4">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">Автоматическое резервное копирование</label>
                        <p className="text-xs text-muted-foreground">
                          Автоматически создавать бэкапы по расписанию
                        </p>
                      </div>
                      <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
                    </div>

                    {autoBackup && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Частота резервного копирования</label>
                        <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Ежедневно</SelectItem>
                            <SelectItem value="weekly">Еженедельно</SelectItem>
                            <SelectItem value="monthly">Ежемесячно</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4">
                    <Button onClick={handleTestConnection} disabled={isTesting} variant="outline">
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Проверить подключение
                    </Button>

                    <Button onClick={handleSaveSettings} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {configured ? 'Обновить настройки' : 'Сохранить настройки'}
                    </Button>

                    {configured && (
                      <Button
                        onClick={handleRemoveSettings}
                        disabled={isLoading}
                        variant="destructive"
                      >
                        Удалить настройки
                      </Button>
                    )}
                  </div>

                  {testResults && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Результаты тестирования:</h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(testResults).map(([test, result]) => (
                          <div key={test} className="flex items-center gap-2">
                            {(result as Record<string, unknown>).success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span>{test}</span>
                            {(result as Record<string, unknown>).duration && (
                              <span className="text-muted-foreground">
                                ({(result as Record<string, unknown>).duration}ms)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
                    <p>
                      <strong>Как получить ключи доступа:</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Войдите в консоль Yandex Cloud</li>
                      <li>Перейдите в раздел &quot;Сервисные аккаунты&quot;</li>
                      <li>Создайте статический ключ доступа</li>
                      <li>Скопируйте Access Key ID и Secret Access Key</li>
                      <li>Создайте бакет в Object Storage</li>
                    </ol>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Экспорт данных
              </CardTitle>
              <CardDescription>
                Экспортируйте данные из U-ON в Yandex Cloud Object Storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleExport('json')}
                  disabled={isExporting}
                  variant="outline"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Экспорт в JSON
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={isExporting}
                  variant="outline"
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Экспорт в CSV (для DataLens)
                </Button>
              </div>

              {exportHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">История экспорта:</h4>
                  <div className="space-y-2">
                    {exportHistory.slice(0, 5).map((exp, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <span className="text-sm">{exp.entityType}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {exp.recordsExported} записей • {formatBytes(exp.fileSize)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Резервное копирование
              </CardTitle>
              <CardDescription>
                Создавайте полные резервные копии данных в Yandex Cloud
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
                {isCreatingBackup ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <HardDrive className="h-4 w-4 mr-2" />
                )}
                Создать бэкап сейчас
              </Button>

              {backupHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">История бэкапов:</h4>
                  <div className="space-y-2">
                    {backupHistory.map((backup) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-3 bg-muted rounded"
                      >
                        <div className="flex items-center gap-3">
                          {backup.status === 'success' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : backup.status === 'in_progress' ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {backup.backupId || `Бэкап #${backup.id}`}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(backup.startedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div>{backup.recordsExported} записей</div>
                          <div className="text-muted-foreground">
                            {formatBytes(backup.fileSize)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {backupHistory.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  Бэкапы ещё не создавались. Создайте первый бэкап, чтобы сохранить данные.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
