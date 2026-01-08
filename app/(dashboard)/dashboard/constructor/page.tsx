'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  FieldMapper,
  type FieldDefinition,
  type FieldMapping,
} from '@/components/constructor/field-mapper';
import {
  EntityFlow,
  type EntityConfig,
  defaultEntityConfigs,
} from '@/components/constructor/entity-flow';
import {
  StatusMapper,
  type StatusMapping,
  defaultUonStatuses,
  defaultAmoCrmPipelines,
} from '@/components/constructor/status-mapper';
import {
  DataPreview,
  sampleSourceData,
} from '@/components/constructor/data-preview';
import {
  Save,
  Play,
  Settings2,
  ArrowLeftRight,
  GitBranch,
  Eye,
  CheckCircle2,
} from 'lucide-react';

// U-ON Tourist fields
const uonTouristFields: FieldDefinition[] = [
  { id: 'id', name: 'id', label: 'ID', type: 'string', required: true },
  { id: 'name', name: 'name', label: 'ФИО', type: 'string', required: true },
  { id: 'email', name: 'email', label: 'Email', type: 'email' },
  { id: 'phone', name: 'phone', label: 'Телефон', type: 'phone' },
  { id: 'phone_mobile', name: 'phone_mobile', label: 'Мобильный', type: 'phone' },
  { id: 'birthday', name: 'birthday', label: 'Дата рождения', type: 'date' },
  { id: 'passport', name: 'passport', label: 'Паспорт', type: 'string' },
  { id: 'address', name: 'address', label: 'Адрес', type: 'string' },
  { id: 'note', name: 'note', label: 'Примечание', type: 'string' },
  { id: 'created_at', name: 'created_at', label: 'Дата создания', type: 'date' },
];

// amoCRM Contact fields
const amoCrmContactFields: FieldDefinition[] = [
  { id: 'name', name: 'name', label: 'Имя', type: 'string', required: true },
  { id: 'first_name', name: 'first_name', label: 'Имя (отдельно)', type: 'string' },
  { id: 'last_name', name: 'last_name', label: 'Фамилия', type: 'string' },
  { id: 'email', name: 'email', label: 'Email', type: 'email' },
  { id: 'phone', name: 'phone', label: 'Телефон', type: 'phone' },
  { id: 'position', name: 'position', label: 'Должность', type: 'string' },
  { id: 'company', name: 'company', label: 'Компания', type: 'string' },
];

// U-ON Request fields
const uonRequestFields: FieldDefinition[] = [
  { id: 'id', name: 'id', label: 'ID заявки', type: 'string', required: true },
  { id: 'tourist_id', name: 'tourist_id', label: 'ID туриста', type: 'string' },
  { id: 'manager_id', name: 'manager_id', label: 'ID менеджера', type: 'string' },
  { id: 'status', name: 'status', label: 'Статус', type: 'string' },
  { id: 'source', name: 'source', label: 'Источник', type: 'string' },
  { id: 'date_begin', name: 'date_begin', label: 'Дата начала', type: 'date' },
  { id: 'date_end', name: 'date_end', label: 'Дата окончания', type: 'date' },
  { id: 'country', name: 'country', label: 'Страна', type: 'string' },
  { id: 'city', name: 'city', label: 'Город', type: 'string' },
  { id: 'hotel', name: 'hotel', label: 'Отель', type: 'string' },
  { id: 'price', name: 'price', label: 'Стоимость', type: 'number' },
  { id: 'note', name: 'note', label: 'Примечание', type: 'string' },
  { id: 'created_at', name: 'created_at', label: 'Дата создания', type: 'date' },
];

// amoCRM Lead fields
const amoCrmLeadFields: FieldDefinition[] = [
  { id: 'name', name: 'name', label: 'Название', type: 'string', required: true },
  { id: 'price', name: 'price', label: 'Бюджет', type: 'number' },
  { id: 'status_id', name: 'status_id', label: 'Этап воронки', type: 'string' },
  { id: 'pipeline_id', name: 'pipeline_id', label: 'Воронка', type: 'string' },
  { id: 'responsible_user_id', name: 'responsible_user_id', label: 'Ответственный', type: 'string' },
  { id: 'source', name: 'source', label: 'Источник', type: 'string' },
  { id: 'note', name: 'note', label: 'Примечание', type: 'string' },
];

export default function ConstructorPage() {
  const [activeTab, setActiveTab] = useState('entities');
  const [selectedEntity, setSelectedEntity] = useState<'tourists' | 'requests'>('tourists');

  // Entity configurations
  const [entityConfigs, setEntityConfigs] = useState<EntityConfig[]>(defaultEntityConfigs);

  // Field mappings for different entities
  const [touristMappings, setTouristMappings] = useState<FieldMapping[]>([]);
  const [requestMappings, setRequestMappings] = useState<FieldMapping[]>([]);

  // Status mappings
  const [statusMappings, setStatusMappings] = useState<StatusMapping[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleEntityChange = (id: string, updates: Partial<EntityConfig>) => {
    setEntityConfigs((configs) =>
      configs.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('Конфигурация сохранена!');
  };

  const handleTest = async () => {
    setIsTesting(true);
    // Simulate test sync
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsTesting(false);
    alert('Тест синхронизации завершен успешно!');
  };

  const enabledEntities = entityConfigs.filter((e) => e.enabled).length;
  const totalMappings = touristMappings.length + requestMappings.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Конструктор интеграции</h1>
          <p className="text-muted-foreground mt-1">
            Визуально настройте маппинг данных между U-ON и amoCRM
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            <Play className="h-4 w-4 mr-2" />
            {isTesting ? 'Тестирование...' : 'Тест синхронизации'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{enabledEntities}</p>
                <p className="text-sm text-muted-foreground">Активных сущностей</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <GitBranch className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalMappings}</p>
                <p className="text-sm text-muted-foreground">Связей полей</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusMappings.length}</p>
                <p className="text-sm text-muted-foreground">Связей статусов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="entities" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Сущности
          </TabsTrigger>
          <TabsTrigger value="fields" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Поля
          </TabsTrigger>
          <TabsTrigger value="statuses" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Статусы
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Предпросмотр
          </TabsTrigger>
        </TabsList>

        {/* Entities Tab */}
        <TabsContent value="entities" className="mt-6">
          <EntityFlow
            entities={entityConfigs}
            onEntityChange={handleEntityChange}
            sourceSystem="U-ON"
            targetSystem="amoCRM"
          />
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="mt-6 space-y-6">
          {/* Entity selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Выберите сущность</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button
                  variant={selectedEntity === 'tourists' ? 'default' : 'outline'}
                  onClick={() => setSelectedEntity('tourists')}
                >
                  Туристы → Контакты
                  <Badge variant="secondary" className="ml-2">
                    {touristMappings.length}
                  </Badge>
                </Button>
                <Button
                  variant={selectedEntity === 'requests' ? 'default' : 'outline'}
                  onClick={() => setSelectedEntity('requests')}
                >
                  Заявки → Сделки
                  <Badge variant="secondary" className="ml-2">
                    {requestMappings.length}
                  </Badge>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Field mapper */}
          {selectedEntity === 'tourists' ? (
            <FieldMapper
              sourceFields={uonTouristFields}
              targetFields={amoCrmContactFields}
              mappings={touristMappings}
              onMappingsChange={setTouristMappings}
              sourceLabel="U-ON Турист"
              targetLabel="amoCRM Контакт"
            />
          ) : (
            <FieldMapper
              sourceFields={uonRequestFields}
              targetFields={amoCrmLeadFields}
              mappings={requestMappings}
              onMappingsChange={setRequestMappings}
              sourceLabel="U-ON Заявка"
              targetLabel="amoCRM Сделка"
            />
          )}
        </TabsContent>

        {/* Statuses Tab */}
        <TabsContent value="statuses" className="mt-6">
          <StatusMapper
            sourceStatuses={defaultUonStatuses}
            targetPipelines={defaultAmoCrmPipelines}
            mappings={statusMappings}
            onMappingsChange={setStatusMappings}
          />
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-6">
          <DataPreview
            sourceData={sampleSourceData}
            mappings={selectedEntity === 'tourists' ? touristMappings : requestMappings}
            onRefresh={() => console.log('Refresh data')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
