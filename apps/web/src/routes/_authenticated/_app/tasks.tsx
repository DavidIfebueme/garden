import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { TaskTabsStrip } from '@/components/shell/task-tabs'

/**
 * Tasks surface layout: owns the tab strip for both the list and open task
 * details (TanStack nests tasks.$issueId under this route — the Outlet renders
 * the child). Strip active state derives from the matched child's issueId.
 */
export const Route = createFileRoute('/_authenticated/_app/tasks')({
  component: TasksLayout,
})

function TasksLayout() {
  const activeId = useRouterState({
    select: (s) => {
      const params = s.matches[s.matches.length - 1]?.params as
        | { issueId?: string }
        | undefined
      return params?.issueId ?? null
    },
  })
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TaskTabsStrip activeId={activeId} />
      <Outlet />
    </div>
  )
}
