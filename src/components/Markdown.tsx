import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

/**
 * The agents return markdown, not plain text — headings throughout, and the
 * budget breakdown is a GFM pipe table, hence remark-gfm.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-table:text-sm prose-th:text-left prose-a:break-words',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // prose emits a bare <table>; without this a wide budget table scrolls
          // the whole page sideways on a phone. `display:block` on the table
          // itself would work but destroys the table formatting context.
          table: ({ node: _node, ...props }) => (
            <div className="w-full overflow-x-auto">
              <table {...props} />
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
