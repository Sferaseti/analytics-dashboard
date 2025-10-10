'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';

export default function AdminLogoutPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Redirect to login page
        router.push('/sign-in');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="mt-6 text-2xl font-bold text-gray-900">
              Выход из системы
            </CardTitle>
            <p className="mt-2 text-sm text-gray-600">
              Вы уверены, что хотите выйти из административной панели?
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти из системы
            </Button>
            <Button
              onClick={handleGoBack}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться назад
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}