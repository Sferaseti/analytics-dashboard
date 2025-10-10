'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Settings, 
  Database, 
  Mail, 
  Shield, 
  Globe, 
  Bell, 
  Save,
  AlertTriangle,
  Server,
  Key,
  Palette
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  adminEmail: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailNotifications: boolean;
  maxUsersPerTeam: number;
  sessionTimeout: number;
  backupFrequency: string;
  logLevel: string;
  theme: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'Analytics Platform',
    siteDescription: 'Платформа для аналитики и управления данными',
    adminEmail: 'admin@example.com',
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    maxUsersPerTeam: 10,
    sessionTimeout: 24,
    backupFrequency: 'daily',
    logLevel: 'info',
    theme: 'system'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // TODO: Load settings from API
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Save settings to API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      console.log('Settings saved:', settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Системные настройки</h1>
          <p className="text-muted-foreground">
            Управление конфигурацией и параметрами системы
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Сохранение...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Сохранить
            </>
          )}
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Общие настройки
          </CardTitle>
          <CardDescription>
            Основные параметры сайта и приложения
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="siteName">Название сайта</Label>
              <Input
                id="siteName"
                value={settings.siteName}
                onChange={(e) => updateSetting('siteName', e.target.value)}
                placeholder="Введите название сайта"
              />
            </div>
            <div>
              <Label htmlFor="adminEmail">Email администратора</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => updateSetting('adminEmail', e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="siteDescription">Описание сайта</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSetting('siteDescription', e.target.value)}
              placeholder="Краткое описание вашего сайта"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security & Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Безопасность и доступ
          </CardTitle>
          <CardDescription>
            Настройки безопасности и управления доступом
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Режим обслуживания</Label>
              <p className="text-sm text-muted-foreground">
                Временно отключить доступ к сайту для всех пользователей
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked: boolean) => updateSetting('maintenanceMode', checked)}
            />
              {settings.maintenanceMode && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Активен
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Регистрация новых пользователей</Label>
              <p className="text-sm text-muted-foreground">
                Разрешить регистрацию новых аккаунтов
              </p>
            </div>
            <Switch
              checked={settings.registrationEnabled}
              onCheckedChange={(checked: boolean) => updateSetting('registrationEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxUsers">Максимум пользователей в команде</Label>
              <Input
                id="maxUsers"
                type="number"
                min="1"
                max="100"
                value={settings.maxUsersPerTeam}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('maxUsersPerTeam', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="sessionTimeout">Время сессии (часы)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="1"
                max="168"
                value={settings.sessionTimeout}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('sessionTimeout', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Уведомления
          </CardTitle>
          <CardDescription>
            Настройки системных уведомлений
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Отправлять уведомления администратору на email
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked: boolean) => updateSetting('emailNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Система
          </CardTitle>
          <CardDescription>
            Системные параметры и конфигурация
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="backupFrequency">Частота резервного копирования</Label>
              <Select
                value={settings.backupFrequency}
                onValueChange={(value) => updateSetting('backupFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Каждый час</SelectItem>
                  <SelectItem value="daily">Ежедневно</SelectItem>
                  <SelectItem value="weekly">Еженедельно</SelectItem>
                  <SelectItem value="monthly">Ежемесячно</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="logLevel">Уровень логирования</Label>
              <Select
                value={settings.logLevel}
                onValueChange={(value) => updateSetting('logLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Только ошибки</SelectItem>
                  <SelectItem value="warn">Предупреждения</SelectItem>
                  <SelectItem value="info">Информация</SelectItem>
                  <SelectItem value="debug">Отладка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="theme">Тема интерфейса</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => updateSetting('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Светлая</SelectItem>
                  <SelectItem value="dark">Темная</SelectItem>
                  <SelectItem value="system">Системная</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            База данных
          </CardTitle>
          <CardDescription>
            Информация о базе данных и операции обслуживания
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">1.2GB</div>
              <p className="text-sm text-muted-foreground">Размер БД</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">15</div>
              <p className="text-sm text-muted-foreground">Таблиц</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">Здорова</div>
              <p className="text-sm text-muted-foreground">Состояние</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm">
              <Database className="mr-2 h-4 w-4" />
              Оптимизировать
            </Button>
            <Button variant="outline" size="sm">
              <Key className="mr-2 h-4 w-4" />
              Создать резервную копию
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}