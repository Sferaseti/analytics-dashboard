'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Shield,
  Activity,
  Menu,
  Crown,
  Database,
  FileText,
  Bell,
  LogOut,
  CreditCard,
  User
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

const sidebarNavItems = [
  {
    title: 'Дашборд',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Обзор системы'
  },
  {
    title: 'Пользователи',
    href: '/admin/users',
    icon: Users,
    description: 'Управление пользователями'
  },
  {
    title: 'Аналитика отчетов',
    href: '/admin/reports-analytics',
    icon: BarChart3,
    description: 'Статистика использования отчетов'
  },
  {
    title: 'Финансы',
    href: '/admin/finance',
    icon: CreditCard,
    description: 'Платежи и настройки ЮKassa'
  },
  {
    title: 'Активность',
    href: '/admin/activity',
    icon: Activity,
    description: 'Логи активности'
  },
  {
    title: 'База данных',
    href: '/admin/database',
    icon: Database,
    description: 'Управление БД'
  },
  {
    title: 'Настройки',
    href: '/admin/settings',
    icon: Settings,
    description: 'Системные настройки'
  }
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn('pb-12', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center mb-2 px-4">
            <Crown className="h-6 w-6 text-yellow-500 mr-2" />
            <h2 className="text-lg font-semibold tracking-tight">
              Супер Админ
            </h2>
          </div>
          <div className="space-y-1">
            {sidebarNavItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  pathname === item.href && 'bg-muted font-medium'
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Открыть меню</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <Sidebar />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}