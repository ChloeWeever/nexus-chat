import { cn } from '@/lib/utils'
import iconUrl from '@/assets/icon.svg'

interface AppIconProps {
  className?: string
}

export function AppIcon({ className }: AppIconProps) {
  return (
    <img
      src={iconUrl}
      alt="App icon"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    />
  )
}
