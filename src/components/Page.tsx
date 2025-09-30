import React from 'react'
import { cn } from '../lib/utils'

interface PageProps {
  children: React.ReactNode
  className?: string
}

export const Page: React.FC<PageProps> = ({ children, className }) => {
  return (
    <div className={cn('p-6 h-full flex flex-col', className)}>
      {children}
    </div>
  )
}
