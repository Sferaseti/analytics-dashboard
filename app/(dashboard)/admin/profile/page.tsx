'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Shield, Calendar } from 'lucide-react';
import { updateAccount } from '@/app/(login)/actions';
import { User as UserType } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type ProfileFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
  user?: UserType;
};

function ProfileForm({
  state,
  nameValue = '',
  emailValue = '',
  user
}: ProfileFormProps) {
  return (
    <div className="space-y-6">
      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Информация профиля
          </CardTitle>
          <CardDescription>
            Управление основной информацией вашего профиля
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-medium">
              {emailValue.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{nameValue || 'Не указано'}</h3>
                {user?.role === 'super_admin' && (
                  <Badge variant="destructive" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Супер Админ
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {emailValue}
              </p>
              {user?.createdAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  Зарегистрирован: {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Редактировать профиль</CardTitle>
          <CardDescription>
            Обновите свою личную информацию
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-2">
                Имя
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Введите ваше имя"
                defaultValue={state.name || nameValue}
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="mb-2">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Введите ваш email"
                defaultValue={emailValue}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<UserType>('/api/user', fetcher);
  return (
    <ProfileForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
      user={user}
    />
  );
}

export default function AdminProfilePage() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {}
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Профиль администратора</h1>
        <p className="text-muted-foreground">
          Управление вашим профилем и личной информацией
        </p>
      </div>

      <form action={formAction}>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Загрузка профиля...</p>
            </div>
          </div>
        }>
          <ProfileFormWithData state={state} />
        </Suspense>

        {state.error && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-red-500 text-sm">{state.error}</p>
            </CardContent>
          </Card>
        )}
        
        {state.success && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-green-500 text-sm">{state.success}</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить изменения'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}