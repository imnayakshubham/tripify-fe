import { AdminView } from '@/components/AdminView'

export function AdminRoute() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <AdminView />
      </div>
    </div>
  )
}
