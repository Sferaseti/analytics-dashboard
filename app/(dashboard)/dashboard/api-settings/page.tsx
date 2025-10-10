'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ApiSettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Загружаем информацию о ключе при загрузке страницы
  useEffect(() => {
    loadKeyInfo();
  }, []);

  const loadKeyInfo = async () => {
    try {
      setIsLoadingKey(true);
      const response = await fetch('/api/teams/uon-key');
      const data = await response.json();
      
      if (response.ok) {
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey || '');
      }
    } catch (error) {
      console.error('Ошибка при загрузке информации о ключе:', error);
    } finally {
      setIsLoadingKey(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setMessage('Пожалуйста, введите API ключ');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/teams/uon-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'API ключ успешно сохранен');
        setMessageType('success');
        setApiKey('');
        await loadKeyInfo(); // Перезагружаем информацию о ключе
      } else {
        setMessage(data.error || 'Ошибка при сохранении API ключа');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка при сохранении API ключа');
      setMessageType('error');
      console.error('Ошибка:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm('Вы уверены, что хотите удалить API ключ? Это остановит синхронизацию данных.')) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/teams/uon-key', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'API ключ успешно удален');
        setMessageType('success');
        await loadKeyInfo(); // Перезагружаем информацию о ключе
      } else {
        setMessage(data.error || 'Ошибка при удалении API ключа');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка при удалении API ключа');
      setMessageType('error');
      console.error('Ошибка:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки API</h1>
        <p className="text-muted-foreground mt-2">
          Управление API ключами для интеграции с внешними сервисами
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>U-ON API Ключ</CardTitle>
          <CardDescription>
            Настройте API ключ для синхронизации данных с системой U-ON. 
            Каждая команда имеет свой уникальный ключ для обеспечения безопасности данных.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingKey ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Загрузка информации о ключе...</span>
            </div>
          ) : (
            <>
              {hasKey && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Текущий API ключ:</label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      value={showKey ? maskedKey : maskedKey}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleRemoveKey}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Удалить'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {hasKey ? 'Обновить API ключ:' : 'Введите API ключ:'}
                </label>
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Введите ваш U-ON API ключ"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <Button onClick={handleSaveKey} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      hasKey ? 'Обновить' : 'Сохранить'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

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

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Как получить API ключ:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Войдите в вашу систему U-ON</li>
              <li>Перейдите в раздел "Настройки" → "API"</li>
              <li>Скопируйте ваш уникальный API ключ</li>
              <li>Вставьте его в поле выше и нажмите "Сохранить"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}