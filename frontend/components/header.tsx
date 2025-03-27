'use client'

import React from 'react'
import Link from 'next/link'
import { IconLogo } from './ui/icons'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { useRouter } from 'next/navigation'

export const Header: React.FC = () => {
  const router = useRouter()
  
  return (
    <header className="fixed w-full p-0 md:p-2 flex justify-between items-center z-10 backdrop-blur md:backdrop-blur-none bg-background/80 md:bg-transparent">
      <div className="p-2">
        <a href="/">
          <IconLogo className={cn('w-5 h-5')} />
          <span className="sr-only">Cogno</span>
        </a>
      </div>
      
      <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center"> 
        <a href="/">
          <img 
            src="/cogni-logo.png" 
            alt="Cogni" 
            className="h-20 w-auto mb-4"
          />
        </a>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          onClick={() => router.push('/collaborate')}
          className="mr-2"
        >
          Collaborate
        </Button>
      </div>
    </header>
  )
}

export default Header
