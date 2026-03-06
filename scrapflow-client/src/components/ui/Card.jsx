import { cn } from "@/lib/utils"

export const Card = ({ className, children, ...props }) => {
  return (
    <div className={cn("glass-card p-6", className)} {...props}>
      {children}
    </div>
  )
}

export const CardHeader = ({ className, children, ...props }) => {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  )
}

export const CardTitle = ({ className, children, ...props }) => {
  return (
    <h3 className={cn("text-lg font-bold tracking-tight text-[var(--color-text)]", className)} {...props}>
      {children}
    </h3>
  )
}
