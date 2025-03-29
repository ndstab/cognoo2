import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const exampleMessages = [
  {
    heading: 'Who is Cogni, and how can it transform your experience with AI-driven solutions?',
    message: 'Who is Cogni, and how can it transform your experience with AI-driven solutions?'
  },
  {
    heading: 'What is the meaning and purpose of life?',
    message: 'What is the meaning and purpose of life?'
  },
    {heading: 'Best Eateries inside IIT Bombay',
    message: 'Best Eateries inside IIT Bombay'
  },
  {
    heading: 'Who is Professor Tatsuya from the EMC Musashino University',
    message: 'Who is Professor Tatsuya from theEMC Musashino University'
  }
]
export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-4 flex flex-col items-start space-y-3 mb-4 pb-8 sm:pb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-sm sm:text-base text-left whitespace-normal break-words"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <ArrowRight size={16} className="mr-2 text-muted-foreground flex-shrink-0" />
              <span className="break-words">{message.heading}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
