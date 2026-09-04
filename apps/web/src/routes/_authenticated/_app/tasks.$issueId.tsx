import { createFileRoute } from '@tanstack/react-router'
import { useSurfaceTabsStore } from '@garden/app-state/surface-tabs'
import { IssueDetail } from '@/features/issues/components'
import { TaskTabsStrip } from '@/components/shell/task-tabs'

export const Route = createFileRoute('/_authenticated/_app/tasks/$issueId')({
  // workspace_id rides along on external deep links (emails) so auth can pick
  // the right organization; not consumed by the surface itself.
  validateSearch: (search) => {
    const out: { workspace_id?: string } = {}
    if (typeof search.workspace_id === 'string')
      out.workspace_id = search.workspace_id
    return out
  },
  // Client-only tab bookkeeping on direct loads. Runs outside React render
  // (loaders are the router's data boundary), keeping the no-useEffect rule
  // intact; skipped on the server where the workspace store is empty. The
  // strip upgrades the raw id to the real title via the live query cache.
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
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TaskTabsStrip activeId={issueId} />
      <IssueDetail issueId={issueId} />
    </div>
  )
}
