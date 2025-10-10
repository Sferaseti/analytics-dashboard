'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Activity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  type: 'login' | 'signup' | 'update' | 'delete';
}

const activities: Activity[] = [
  {
    id: '1',
    user: 'test@test.com',
    action: 'Вошел в систему',
    timestamp: '2 минуты назад',
    type: 'login'
  },
  {
    id: '2',
    user: 'mail@mail.ru',
    action: 'Обновил профиль',
    timestamp: '5 минут назад',
    type: 'update'
  },
  {
    id: '3',
    user: 'admin@admin.com',
    action: 'Создал нового пользователя',
    timestamp: '10 минут назад',
    type: 'signup'
  },
  {
    id: '4',
    user: 'user@example.com',
    action: 'Удалил команду',
    timestamp: '15 минут назад',
    type: 'delete'
  },
  {
    id: '5',
    user: 'demo@demo.com',
    action: 'Вошел в систему',
    timestamp: '20 минут назад',
    type: 'login'
  }
];

const getActivityColor = (type: Activity['type']) => {
  switch (type) {
    case 'login':
      return 'bg-green-100 text-green-800';
    case 'signup':
      return 'bg-blue-100 text-blue-800';
    case 'update':
      return 'bg-yellow-100 text-yellow-800';
    case 'delete':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function RecentActivity() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center space-x-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              {activity.user.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium leading-none">
                {activity.user}
              </p>
              <Badge variant="secondary" className={getActivityColor(activity.type)}>
                {activity.type}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {activity.action}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {activity.timestamp}
          </div>
        </div>
      ))}
    </div>
  );
}