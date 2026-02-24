import { cn } from "../../utils/utils"

export const Input = ({ className, label, error, ...props }) => {
  return (
    <div className="w-full space-y-2">
      {label && <label className="text-sm font-medium text-gray-500 ml-1">{label}</label>}
      <input
        className={cn(
          "w-full bg-white dark:bg-gray-900 border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
          error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  )
}
