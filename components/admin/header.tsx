'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MobileSidebar } from './sidebar';
import { Bell, LogOut, Settings, User, Crown, UserX, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HeaderProps {
  user?: {
    email: string;
    role: string;
  };
}

export function Header({ user }: HeaderProps) {
  const [notifications, setNotifications] = useState(0);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Получаем информацию о сессии для проверки имперсонации
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          setSession(userData);
        }
      } catch (error) {
        console.error('Ошибка получения сессии:', error);
      }
    };

    fetchSession();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const exitImpersonation = async () => {
    try {
      const response = await fetch('/api/admin/exit-impersonation', {
        method: 'POST',
      });
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Ошибка выхода из имперсонации:', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      {/* Индикатор имперсонации */}
      {session?.impersonation?.isImpersonating && (
        <div className="bg-orange-100 border-b border-orange-200">
          <div className="container flex h-12 items-center justify-between">
            <Alert className="border-0 bg-transparent p-0">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 ml-2">
                Вы вошли как пользователь. Оригинальный админ: {session.impersonation.originalUserId}
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exitImpersonation}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <UserX className="mr-2 h-4 w-4" />
              Выйти из режима
            </Button>
          </div>
        </div>
      )}
      
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <MobileSidebar />
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {notifications}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.email || 'admin@admin.com'}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Crown className="h-3 w-3 text-yellow-500" />
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.role === 'super_admin' ? 'Супер Админ' : user?.role || 'Super Admin'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/admin/profile" className="flex w-full items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Профиль</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/admin/settings" className="flex w-full items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Настройки</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}