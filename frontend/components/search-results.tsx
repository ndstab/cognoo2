'use client'

import { useState } from 'react'
import { AvatarImage, Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CardContent, Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export interface SearchResultsProps {
  results: { title: string; url: string; content: string }[]
}

export function SearchResults({ results }: SearchResultsProps) {
  const [showAllResults, setShowAllResults] = useState(false)

  const handleViewMore = () => {
    setShowAllResults(true)
  }

  const displayedResults = showAllResults ? results : results.slice(0, 3)
  const additionalResultsCount = results.length > 3 ? results.length - 3 : 0

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {displayedResults.map((result: any, index: any) => (
        <Link href={result.url} passHref target="_blank" key={index} className="no-underline">
          <div className="flex items-center gap-2 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors cursor-pointer">
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={`https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}`}
                alt={result.title}
              />
              <AvatarFallback>{new URL(result.url).hostname[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground truncate max-w-[150px]">
              {new URL(result.url).hostname}
            </span>
          </div>
        </Link>
      ))}
      {!showAllResults && additionalResultsCount > 0 && (
        <Button
          variant="ghost"
          className="rounded-full text-sm text-muted-foreground"
          onClick={handleViewMore}
        >
          +{additionalResultsCount} more
        </Button>
      )}
    </div>
  )
}