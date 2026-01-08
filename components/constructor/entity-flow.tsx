'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Users,
  FileText,
  Phone,
  Building2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EntityConfig {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  sourceLabel: string;
  targetLabel: string;
  icon: React.ReactNode;
  enabled: boolean;
  syncDirection: 'source_to_target' | 'target_to_source' | 'bidirectional';
  lastSync?: Date;
  recordsCount?: number;
  status?: 'idle' | 'syncing' | 'success' | 'error';
}

interface EntityFlowProps {
  entities: EntityConfig[];
  onEntityChange: (id: string, updates: Partial<EntityConfig>) => void;
  sourceSystem: string;
  targetSystem: string;
}

const statusIcons = {
  idle: null,
  syncing: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
};

export function EntityFlow({
  entities,
  onEntityChange,
  sourceSystem = 'U-ON',
  targetSystem = 'amoCRM',
}: EntityFlowProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Поток данных</CardTitle>
        <p className="text-sm text-muted-foreground">
          Выберите сущности для синхронизации между {sourceSystem} и {targetSystem}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center px-4 py-2 bg-muted rounded-lg">
            <div className="font-medium text-center">{sourceSystem}</div>
            <div className="w-16"></div>
            <div className="font-medium text-center">{targetSystem}</div>
          </div>

          {/* Entity rows */}
          {entities.map((entity) => (
            <div
              key={entity.id}
              className={cn(
                'grid grid-cols-[1fr,auto,1fr] gap-4 items-center p-4 rounded-lg border transition-all',
                entity.enabled ? 'bg-card border-primary/20' : 'bg-muted/50 border-muted'
              )}
            >
              {/* Source entity */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    entity.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {entity.icon}
                </div>
                <div>
                  <p className={cn('font-medium', !entity.enabled && 'text-muted-foreground')}>
                    {entity.sourceLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">{entity.sourceEntity}</p>
                </div>
              </div>

              {/* Arrow and toggle */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={entity.enabled}
                    onCheckedChange={(checked) => onEntityChange(entity.id, { enabled: checked })}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {entity.syncDirection === 'bidirectional' ? (
                    <>
                      <ArrowRight className={cn('h-4 w-4', !entity.enabled && 'text-muted-foreground')} />
                      <ArrowRight className={cn('h-4 w-4 rotate-180', !entity.enabled && 'text-muted-foreground')} />
                    </>
                  ) : entity.syncDirection === 'source_to_target' ? (
                    <ArrowRight className={cn('h-4 w-4', !entity.enabled && 'text-muted-foreground')} />
                  ) : (
                    <ArrowRight className={cn('h-4 w-4 rotate-180', !entity.enabled && 'text-muted-foreground')} />
                  )}
                </div>
                {entity.status && statusIcons[entity.status]}
              </div>

              {/* Target entity */}
              <div className="flex items-center gap-3 justify-end">
                <div className="text-right">
                  <p className={cn('font-medium', !entity.enabled && 'text-muted-foreground')}>
                    {entity.targetLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">{entity.targetEntity}</p>
                </div>
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    entity.enabled ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {entity.icon}
                </div>
              </div>

              {/* Stats row */}
              {entity.enabled && (
                <div className="col-span-3 flex items-center justify-center gap-4 pt-2 border-t mt-2">
                  {entity.recordsCount !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {entity.recordsCount} записей
                    </Badge>
                  )}
                  {entity.lastSync && (
                    <span className="text-xs text-muted-foreground">
                      Последняя синхронизация: {entity.lastSync.toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Default entity configurations for U-ON to amoCRM
export const defaultEntityConfigs: EntityConfig[] = [
  {
    id: 'tourists_contacts',
    sourceEntity: 'tourists',
    targetEntity: 'contacts',
    sourceLabel: 'Туристы',
    targetLabel: 'Контакты',
    icon: <Users className="h-5 w-5" />,
    enabled: true,
    syncDirection: 'source_to_target',
    status: 'idle',
  },
  {
    id: 'requests_leads',
    sourceEntity: 'requests',
    targetEntity: 'leads',
    sourceLabel: 'Заявки',
    targetLabel: 'Сделки',
    icon: <FileText className="h-5 w-5" />,
    enabled: true,
    syncDirection: 'source_to_target',
    status: 'idle',
  },
  {
    id: 'leads_leads',
    sourceEntity: 'leads',
    targetEntity: 'leads',
    sourceLabel: 'Лиды',
    targetLabel: 'Сделки',
    icon: <Building2 className="h-5 w-5" />,
    enabled: false,
    syncDirection: 'source_to_target',
    status: 'idle',
  },
  {
    id: 'calls_notes',
    sourceEntity: 'call_history',
    targetEntity: 'notes',
    sourceLabel: 'Звонки',
    targetLabel: 'Примечания',
    icon: <Phone className="h-5 w-5" />,
    enabled: false,
    syncDirection: 'source_to_target',
    status: 'idle',
  },
];
