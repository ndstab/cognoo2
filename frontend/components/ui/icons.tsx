'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

export function IconLogo({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center w-6 h-6', className)} {...props}>
      <img
        src="/cogni-logo.png"
        alt="Cogni Logo"
        className="w-full h-full object-contain"
      />
    </div>
  )
}
