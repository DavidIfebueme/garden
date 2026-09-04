import { createFileRoute } from '@tanstack/react-router'
import { IssuesPage } from '@/features/issues/components'
import { TaskTabsStrip } from '@/components/shell/task-tabs'

export const Route = createFileRoute('/_authenticated/_app/tasks')({
  component: TasksRoute,
})

function TasksRoute() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TaskTabsStrip activeId={null} />
      <IssuesPage />
    </div>
  )
}
