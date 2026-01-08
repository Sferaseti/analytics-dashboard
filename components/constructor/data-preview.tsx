'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldMapping } from './field-mapper';

interface DataPreviewProps {
  sourceData: Record<string, any>[];
  mappings: FieldMapping[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

const transformFunctions: Record<string, (value: any) => any> = {
  none: (v) => v,
  uppercase: (v) => String(v).toUpperCase(),
  lowercase: (v) => String(v).toLowerCase(),
  phone_format: (v) => {
    const cleaned = String(v).replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
    }
    return v;
  },
  date_format: (v) => {
    try {
      return new Date(v).toLocaleDateString('ru-RU');
    } catch {
      return v;
    }
  },
  currency: (v) => {
    try {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
      }).format(Number(v));
    } catch {
      return v;
    }
  },
};

export function DataPreview({
  sourceData,
  mappings,
  onRefresh,
  isLoading = false,
}: DataPreviewProps) {
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [selectedRecord, setSelectedRecord] = useState(0);

  const transformData = (record: Record<string, any>): Record<string, any> => {
    const result: Record<string, any> = {};

    mappings.forEach((mapping) => {
      if (mapping.sourceField && mapping.targetField) {
        const sourceValue = record[mapping.sourceField];
        const transform = mapping.transform || 'none';
        result[mapping.targetField] = transformFunctions[transform](sourceValue);
      }
    });

    return result;
  };

  const currentSource = sourceData[selectedRecord] || {};
  const currentTarget = transformData(currentSource);

  const getFieldStatus = (mapping: FieldMapping) => {
    const sourceValue = currentSource[mapping.sourceField];
    if (sourceValue === undefined || sourceValue === null || sourceValue === '') {
      return 'empty';
    }
    return 'filled';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Предпросмотр данных</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Просмотрите, как данные будут преобразованы
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-none"
            >
              <Eye className="h-4 w-4 mr-1" />
              Таблица
            </Button>
            <Button
              variant={viewMode === 'json' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('json')}
              className="rounded-none"
            >
              <Code className="h-4 w-4 mr-1" />
              JSON
            </Button>
          </div>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Обновить
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sourceData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Нет данных для предпросмотра</p>
            <p className="text-sm mt-1">
              Загрузите данные из U-ON для проверки маппинга
            </p>
          </div>
        ) : (
          <>
            {/* Record selector */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-muted-foreground">Запись:</span>
              <div className="flex gap-1">
                {sourceData.slice(0, 5).map((_, idx) => (
                  <Button
                    key={idx}
                    variant={selectedRecord === idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRecord(idx)}
                    className="w-8 h-8 p-0"
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
              {sourceData.length > 5 && (
                <span className="text-sm text-muted-foreground">
                  из {sourceData.length}
                </span>
              )}
            </div>

            {viewMode === 'table' ? (
              <div className="grid md:grid-cols-[1fr,auto,1fr] gap-6">
                {/* Source panel */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">
                    U-ON (исходные данные)
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                    {mappings.map((mapping) => {
                      const status = getFieldStatus(mapping);
                      return (
                        <div
                          key={mapping.id}
                          className={cn(
                            'p-3 rounded-lg border',
                            status === 'empty' ? 'bg-muted/50' : 'bg-card'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {mapping.sourceField || '—'}
                            </span>
                            {status === 'filled' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                          <p className={cn('font-mono text-sm', status === 'empty' && 'text-muted-foreground italic')}>
                            {currentSource[mapping.sourceField] ?? '(пусто)'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Преобразование</span>
                  </div>
                </div>

                {/* Target panel */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">
                    amoCRM (результат)
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-auto pr-2">
                    {mappings.map((mapping) => {
                      const targetValue = currentTarget[mapping.targetField];
                      const hasValue = targetValue !== undefined && targetValue !== null && targetValue !== '';
                      return (
                        <div
                          key={mapping.id}
                          className={cn(
                            'p-3 rounded-lg border',
                            hasValue ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-muted/50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              {mapping.targetField || '—'}
                            </span>
                            {mapping.transform && mapping.transform !== 'none' && (
                              <Badge variant="outline" className="text-xs">
                                {mapping.transform}
                              </Badge>
                            )}
                          </div>
                          <p className={cn('font-mono text-sm', !hasValue && 'text-muted-foreground italic')}>
                            {targetValue ?? '(пусто)'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="source" className="w-full">
                <TabsList>
                  <TabsTrigger value="source">Исходные данные</TabsTrigger>
                  <TabsTrigger value="target">Результат</TabsTrigger>
                </TabsList>
                <TabsContent value="source">
                  <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[400px] text-sm">
                    {JSON.stringify(currentSource, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="target">
                  <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[400px] text-sm">
                    {JSON.stringify(currentTarget, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Sample source data for preview
export const sampleSourceData = [
  {
    id: '1',
    name: 'Иванов Иван',
    email: 'ivanov@example.com',
    phone: '79991234567',
    created_at: '2024-01-15T10:30:00Z',
    amount: 150000,
  },
  {
    id: '2',
    name: 'Петрова Мария',
    email: 'petrova@example.com',
    phone: '79998765432',
    created_at: '2024-01-16T14:20:00Z',
    amount: 85000,
  },
  {
    id: '3',
    name: 'Сидоров Алексей',
    email: 'sidorov@example.com',
    phone: '79995551234',
    created_at: '2024-01-17T09:15:00Z',
    amount: 220000,
  },
];
