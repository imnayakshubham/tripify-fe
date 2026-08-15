import { CATEGORY_STYLE, normaliseCategory } from '@/lib/trip'
import { cn } from '@/lib/utils'

/** One activity category, coloured from the theme's category tokens. */
export function CategoryTag({
  category,
  className,
}: {
  category: unknown
  className?: string
}) {
  const style = CATEGORY_STYLE[normaliseCategory(category)]
  const Icon = style.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      <Icon className="size-3" />
      {style.label}
    </span>
  )
}
