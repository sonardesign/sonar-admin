import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

interface PageProps {
  children: React.ReactNode
  className?: string
  loading?: boolean
  loadingText?: string
  title?: string
  subtitle?: string
}

export const Page: React.FC<PageProps> = ({ children, className, loading, loadingText }) => {
  if (loading) {
    return (
      <div className={cn('p-6 h-screen flex flex-col items-center justify-center', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{loadingText || 'Loading...'}</p>
      </div>
    )
  }

  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}
