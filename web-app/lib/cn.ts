import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// The most-used utility in the frontend.
// Every component that accepts a className prop or has conditional styles uses this.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/*
Usage examples:

1. Conditional classes based on a prop:
   cn('btn', isActive && 'btn-active', isDisabled && 'opacity-50')
   // if isActive=true, isDisabled=false → 'btn btn-active'

2. Variant classes that could conflict with base:
   cn('text-sm text-gray-500', variant === 'error' && 'text-red-600')
   // Without twMerge: 'text-sm text-gray-500 text-red-600' — both text colors present
   // With twMerge:    'text-sm text-red-600' — conflict resolved, last wins

3. Base class with parent override — what happens without twMerge vs with:
   // Without: cn('px-4 py-2', 'px-6') → 'px-4 py-2 px-6' — both padding-x in string
   //          browser may apply either depending on stylesheet order — unpredictable
   // With:    cn('px-4 py-2', 'px-6') → 'py-2 px-6' — px-4 removed, px-6 wins

4. Combining base with className prop from parent:
   function Button({ className, ...props }) {
     return <button className={cn('rounded bg-blue-600 px-4 py-2', className)} {...props} />
   }
   // Parent: <Button className="bg-red-600" /> → 'rounded px-4 py-2 bg-red-600'
   // bg-blue-600 removed — parent override wins cleanly

5. Multiple conditional expressions:
   cn(
     'base-styles',
     size === 'sm' && 'text-sm px-2',
     size === 'lg' && 'text-lg px-6',
     isLoading && 'opacity-50 cursor-wait',
     isError && 'border-red-500',
     className
   )
*/