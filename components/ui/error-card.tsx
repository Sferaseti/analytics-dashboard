import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { cn } from '@/lib/utils'

interface ErrorCardProps {
  title?: string
  description?: string
  error?: string
  onRetry?: () => void
  className?: string
  variant?: 'default' | 'destructive'
}

export function ErrorCard({
  title = 'Ошибка загрузки',
  description = 'Не удалось загрузить данные. Попробуйте еще раз.',
  error,
  onRetry,
  className,
  variant = 'default'
}: ErrorCardProps) {
  return (
    <Card className={cn(
      'border-destructive/50 bg-destructive/5',
      variant === 'destructive' && 'border-destructive bg-destructive/10',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
        <CardDescription className="text-destructive/80">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3">
            <code className="text-sm text-destructive/90">{error}</code>
          </div>
        )}
        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Повторить
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface ErrorBoundaryProps {
  error: Error | null
  onRetry?: () => void
  fallback?: React.ReactNode
  className?: string
}

export function ErrorBoundary({
  error,
  onRetry,
  fallback,
  className
}: ErrorBoundaryProps) {
  if (!error) return null

  if (fallback) {
    return <div className={className}>{fallback}</div>
  }

  return (
    <ErrorCard
      title="Произошла ошибка"
      description="Что-то пошло не так при загрузке компонента."
      error={error.message}
      onRetry={onRetry}
      className={className}
    />
  )
}