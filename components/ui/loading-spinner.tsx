import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  )
}

export function LoadingCard({ 
  className,
  children 
}: { 
  className?: string
  children?: React.ReactNode 
}) {
  return (
    <div className={cn(
      'rounded-lg border bg-card text-card-foreground shadow-sm p-6',
      'flex items-center justify-center min-h-[200px]',
      className
    )}>
      {children || <LoadingSpinner size="lg" text="Загрузка..." />}
    </div>
  )
}