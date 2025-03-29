'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

export function IconLogo({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center w-6 h-6', className)} {...props}>
      <Image
        src="/cogni-logo.png"
        alt="Cogni Logo"
        width={80}
        height={80}
        className="h-20 w-auto"
        priority
      />
    </div>
  )
}
