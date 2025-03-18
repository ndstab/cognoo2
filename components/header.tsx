'use client'

import React from 'react'
import Link from 'next/link'
import { ModeToggle } from './mode-toggle'
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
      
      <div className="flex flex-col items-center"> 
        <a href="/">
          <img 
            src="/ani.gif" 
            alt="Cogni" 
            className="h-12 w-auto mb-4"
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
        <ModeToggle />
      </div>
    </header>
  )
}

export default Header
