'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Trash2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusDefinition {
  id: string;
  name: string;
  color?: string;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  statuses: StatusDefinition[];
}

export interface StatusMapping {
  id: string;
  sourceStatus: string;
  targetPipeline: string;
  targetStatus: string;
}

interface StatusMapperProps {
  sourceStatuses: StatusDefinition[];
  targetPipelines: PipelineDefinition[];
  mappings: StatusMapping[];
  onMappingsChange: (mappings: StatusMapping[]) => void;
  sourceLabel?: string;
  targetLabel?: string;
}

export function StatusMapper({
  sourceStatuses,
  targetPipelines,
  mappings,
  onMappingsChange,
  sourceLabel = 'U-ON Статусы',
  targetLabel = 'amoCRM Воронка',
}: StatusMapperProps) {
  const [selectedPipeline, setSelectedPipeline] = useState<string>(
    targetPipelines[0]?.id || ''
  );

  const currentPipeline = targetPipelines.find((p) => p.id === selectedPipeline);

  const addMapping = () => {
    const newMapping: StatusMapping = {
      id: `status_mapping_${Date.now()}`,
      sourceStatus: '',
      targetPipeline: selectedPipeline,
      targetStatus: '',
    };
    onMappingsChange([...mappings, newMapping]);
  };

  const updateMapping = (id: string, updates: Partial<StatusMapping>) => {
    onMappingsChange(
      mappings.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const removeMapping = (id: string) => {
    onMappingsChange(mappings.filter((m) => m.id !== id));
  };

  const autoMap = () => {
    if (!currentPipeline) return;

    const newMappings: StatusMapping[] = [];
    const usedTargets = new Set<string>();

    sourceStatuses.forEach((source) => {
      const matchingTarget = currentPipeline.statuses.find(
        (t) =>
          !usedTargets.has(t.id) &&
          (t.name.toLowerCase() === source.name.toLowerCase() ||
            t.name.toLowerCase().includes(source.name.toLowerCase()) ||
            source.name.toLowerCase().includes(t.name.toLowerCase()))
      );

      if (matchingTarget) {
        usedTargets.add(matchingTarget.id);
        newMappings.push({
          id: `status_mapping_${Date.now()}_${source.id}`,
          sourceStatus: source.id,
          targetPipeline: selectedPipeline,
          targetStatus: matchingTarget.id,
        });
      }
    });

    onMappingsChange(newMappings);
  };

  const getStatusLabel = (statuses: StatusDefinition[], statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.name || statusId;
  };

  const getStatusColor = (statuses: StatusDefinition[], statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.color;
  };

  const getUsedSourceStatuses = () => new Set(mappings.map((m) => m.sourceStatus));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Маппинг статусов</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Сопоставьте статусы U-ON с этапами воронки amoCRM
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={autoMap}>
            <Wand2 className="h-4 w-4 mr-2" />
            Автоматически
          </Button>
          <Button variant="outline" size="sm" onClick={addMapping}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Pipeline selector */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Воронка amoCRM</label>
          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Выберите воронку" />
            </SelectTrigger>
            <SelectContent>
              {targetPipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 mb-4 px-2">
          <div className="text-sm font-medium text-muted-foreground">{sourceLabel}</div>
          <div></div>
          <div className="text-sm font-medium text-muted-foreground">{targetLabel}</div>
          <div></div>
        </div>

        {/* Mappings */}
        <div className="space-y-3">
          {mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Нет настроенных связей статусов</p>
              <p className="text-sm mt-1">
                Нажмите "Автоматически" или "Добавить"
              </p>
            </div>
          ) : (
            mappings
              .filter((m) => m.targetPipeline === selectedPipeline || !m.targetPipeline)
              .map((mapping) => (
                <div
                  key={mapping.id}
                  className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 items-center p-3 rounded-lg border bg-card"
                >
                  {/* Source Status */}
                  <Select
                    value={mapping.sourceStatus}
                    onValueChange={(value) =>
                      updateMapping(mapping.id, { sourceStatus: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceStatuses.map((status) => (
                        <SelectItem
                          key={status.id}
                          value={status.id}
                          disabled={
                            getUsedSourceStatuses().has(status.id) &&
                            mapping.sourceStatus !== status.id
                          }
                        >
                          <div className="flex items-center gap-2">
                            {status.color && (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                            )}
                            <span>{status.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Target Status */}
                  <Select
                    value={mapping.targetStatus}
                    onValueChange={(value) =>
                      updateMapping(mapping.id, {
                        targetStatus: value,
                        targetPipeline: selectedPipeline,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите этап" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentPipeline?.statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            {status.color && (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                            )}
                            <span>{status.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapping(mapping.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Default U-ON statuses
export const defaultUonStatuses: StatusDefinition[] = [
  { id: 'new', name: 'Новая', color: '#3b82f6' },
  { id: 'in_progress', name: 'В работе', color: '#f59e0b' },
  { id: 'waiting', name: 'Ожидание', color: '#8b5cf6' },
  { id: 'booked', name: 'Забронировано', color: '#10b981' },
  { id: 'paid', name: 'Оплачено', color: '#22c55e' },
  { id: 'cancelled', name: 'Отменено', color: '#ef4444' },
  { id: 'completed', name: 'Завершено', color: '#6b7280' },
];

// Default amoCRM pipeline example
export const defaultAmoCrmPipelines: PipelineDefinition[] = [
  {
    id: 'main',
    name: 'Основная воронка',
    statuses: [
      { id: 'incoming', name: 'Входящие', color: '#3b82f6' },
      { id: 'negotiation', name: 'Переговоры', color: '#f59e0b' },
      { id: 'decision', name: 'Принимают решение', color: '#8b5cf6' },
      { id: 'agreement', name: 'Согласование договора', color: '#10b981' },
      { id: 'success', name: 'Успешно реализовано', color: '#22c55e' },
      { id: 'closed_lost', name: 'Закрыто и не реализовано', color: '#ef4444' },
    ],
  },
];
