import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@/features/dashboard'

export const Route = createFileRoute('/_authenticated/_app/home')({
  // workspace_id arrives from invitation-accept redirects so auth can select
  // the right organization; not consumed by the dashboard itself.
  validateSearch: (search) => {
    const out: { workspace_id?: string } = {}
    if (typeof search.workspace_id === 'string')
      out.workspace_id = search.workspace_id
    return out
  },
  component: HomeRoute,
})

function HomeRoute() {
  return <DashboardPage />
}
