import { Send } from 'lucide-react'

export function MiniNetworkButton({ disabled = false, onClick }: { disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={onClick}
      className="h-6 w-6 rounded-full hover:bg-muted transition-colors"
    >
      <Send size={18} className={`transition-opacity ${disabled ? 'opacity-50' : 'opacity-100'}`} />
    </button>
  )
}