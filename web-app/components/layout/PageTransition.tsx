'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [displayedPathname, setDisplayedPathname] = useState(pathname)

  useEffect(() => {
    if (pathname !== displayedPathname) {
      setIsVisible(false)
      const timeout = setTimeout(() => {
        setDisplayedPathname(pathname)
        setIsVisible(true)
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [pathname, displayedPathname])

  return (
    <div className={cn('transition-opacity duration-100', isVisible ? 'opacity-100' : 'opacity-0')}>
      {children}
    </div>
  )
}
