'use client';

import { useState, useCallback } from 'react';
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
import { ArrowRight, Plus, Trash2, GripVertical, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'boolean';
  required?: boolean;
}

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'phone_format' | 'date_format' | 'currency';
}

interface FieldMapperProps {
  sourceFields: FieldDefinition[];
  targetFields: FieldDefinition[];
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  sourceLabel?: string;
  targetLabel?: string;
}

const transformOptions = [
  { value: 'none', label: 'Без изменений' },
  { value: 'uppercase', label: 'ЗАГЛАВНЫЕ' },
  { value: 'lowercase', label: 'строчные' },
  { value: 'phone_format', label: 'Формат телефона' },
  { value: 'date_format', label: 'Формат даты' },
  { value: 'currency', label: 'Валюта' },
];

export function FieldMapper({
  sourceFields,
  targetFields,
  mappings,
  onMappingsChange,
  sourceLabel = 'U-ON',
  targetLabel = 'amoCRM',
}: FieldMapperProps) {
  const [draggedMapping, setDraggedMapping] = useState<string | null>(null);

  const addMapping = () => {
    const newMapping: FieldMapping = {
      id: `mapping_${Date.now()}`,
      sourceField: '',
      targetField: '',
      transform: 'none',
    };
    onMappingsChange([...mappings, newMapping]);
  };

  const updateMapping = (id: string, updates: Partial<FieldMapping>) => {
    onMappingsChange(
      mappings.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const removeMapping = (id: string) => {
    onMappingsChange(mappings.filter((m) => m.id !== id));
  };

  const autoMap = () => {
    const newMappings: FieldMapping[] = [];
    const usedTargets = new Set<string>();

    sourceFields.forEach((source) => {
      // Попытка найти соответствующее поле по имени
      const matchingTarget = targetFields.find(
        (t) =>
          !usedTargets.has(t.id) &&
          (t.name.toLowerCase() === source.name.toLowerCase() ||
            t.id.toLowerCase() === source.id.toLowerCase() ||
            t.label.toLowerCase().includes(source.label.toLowerCase()) ||
            source.label.toLowerCase().includes(t.label.toLowerCase()))
      );

      if (matchingTarget) {
        usedTargets.add(matchingTarget.id);
        newMappings.push({
          id: `mapping_${Date.now()}_${source.id}`,
          sourceField: source.id,
          targetField: matchingTarget.id,
          transform: source.type === matchingTarget.type ? 'none' : 'none',
        });
      }
    });

    onMappingsChange(newMappings);
  };

  const getFieldLabel = (fields: FieldDefinition[], fieldId: string) => {
    return fields.find((f) => f.id === fieldId)?.label || fieldId;
  };

  const getFieldType = (fields: FieldDefinition[], fieldId: string) => {
    return fields.find((f) => f.id === fieldId)?.type || 'string';
  };

  const getUsedSourceFields = () => new Set(mappings.map((m) => m.sourceField));
  const getUsedTargetFields = () => new Set(mappings.map((m) => m.targetField));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Маппинг полей</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={autoMap}>
            <Wand2 className="h-4 w-4 mr-2" />
            Автоматически
          </Button>
          <Button variant="outline" size="sm" onClick={addMapping}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить связь
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header */}
        <div className="grid grid-cols-[1fr,auto,1fr,auto,auto] gap-4 mb-4 px-2">
          <div className="text-sm font-medium text-muted-foreground">{sourceLabel}</div>
          <div></div>
          <div className="text-sm font-medium text-muted-foreground">{targetLabel}</div>
          <div className="text-sm font-medium text-muted-foreground">Преобразование</div>
          <div></div>
        </div>

        {/* Mappings */}
        <div className="space-y-3">
          {mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Нет настроенных связей</p>
              <p className="text-sm mt-1">
                Нажмите "Автоматически" или "Добавить связь"
              </p>
            </div>
          ) : (
            mappings.map((mapping, index) => (
              <div
                key={mapping.id}
                className={cn(
                  'grid grid-cols-[1fr,auto,1fr,auto,auto] gap-4 items-center p-3 rounded-lg border bg-card transition-all',
                  draggedMapping === mapping.id && 'opacity-50 border-dashed'
                )}
                draggable
                onDragStart={() => setDraggedMapping(mapping.id)}
                onDragEnd={() => setDraggedMapping(null)}
              >
                {/* Source Field */}
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <Select
                    value={mapping.sourceField}
                    onValueChange={(value) =>
                      updateMapping(mapping.id, { sourceField: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите поле" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceFields.map((field) => (
                        <SelectItem
                          key={field.id}
                          value={field.id}
                          disabled={
                            getUsedSourceFields().has(field.id) &&
                            mapping.sourceField !== field.id
                          }
                        >
                          <div className="flex items-center gap-2">
                            <span>{field.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Target Field */}
                <Select
                  value={mapping.targetField}
                  onValueChange={(value) =>
                    updateMapping(mapping.id, { targetField: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите поле" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetFields.map((field) => (
                      <SelectItem
                        key={field.id}
                        value={field.id}
                        disabled={
                          getUsedTargetFields().has(field.id) &&
                          mapping.targetField !== field.id
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span>{field.label}</span>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Transform */}
                <Select
                  value={mapping.transform || 'none'}
                  onValueChange={(value) =>
                    updateMapping(mapping.id, { transform: value as any })
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transformOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
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
