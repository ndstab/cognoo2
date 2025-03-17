import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const exampleMessages = [
  {
    heading: 'How IIT Bombay produces the best Engineers in India',
    message: 'How IIT Bombay produces the best Engineers in India'
  },
  {
    heading: 'What is the meaning and purpose of life?',
    message: 'What is the meaning and purpose of life?'
  },
  {
    heading: 'How to get Gifts from girls',
    message: 'How to get Gifts from girls'
  },
  {
    heading: 'Reviews of Chandigarh University',
    message: 'Reviews of Chandigarh University'
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
        <div className="mt-4 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <ArrowRight size={16} className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
