import { createFileRoute } from '@tanstack/react-router'
import { useSurfaceTabsStore } from '@garden/app-state/surface-tabs'
import { IssueDetail } from '@/features/issues/components'

export const Route = createFileRoute('/_authenticated/_app/tasks/$issueId')({
  // Client-only tab bookkeeping on direct loads. Runs outside React render
  // (loaders are the router's data boundary), keeping the no-useEffect rule
  // intact; skipped on the server where the workspace store is empty. The
  // strip (in the parent layout) upgrades the raw id to the real title via
  // the live query cache.
  validateSearch: (search) => {
    const out: { workspace_id?: string } = {}
    if (typeof search.workspace_id === 'string')
      out.workspace_id = search.workspace_id
    return out
  },
  loader: ({ params }) => {
    if (typeof window === 'undefined') return
    useSurfaceTabsStore
      .getState()
      .upsertTab('tasks', { id: params.issueId, title: params.issueId })
  },
  component: TaskDetailRoute,
})

function TaskDetailRoute() {
  const { issueId } = Route.useParams()
  return <IssueDetail issueId={issueId} />
}
