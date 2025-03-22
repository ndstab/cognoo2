'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

function IconLogo({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('relative', className)} {...props}>
      <Image
        src="/logo.gif"
        alt="Animated Logo"
        fill
        style={{ objectFit: 'contain' }}
        priority
      />
    </div>
  )
}

export { IconLogo }
