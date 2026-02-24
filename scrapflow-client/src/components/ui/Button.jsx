import { cn } from "../../utils/utils"

export const Button = ({ className, variant = "primary", size = "md", children, ...props }) => {
  const variants = {
    primary: "btn-primary",
    secondary: "bg-background border px-6 py-3 rounded-2xl font-semibold hover:bg-gray-50 active:scale-95 transition-all",
    ghost: "text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all",
    danger: "bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-red-600 active:scale-95 transition-all",
  }

  return (
    <button className={cn(variants[variant], className)} {...props}>
      {children}
    </button>
  )
}
