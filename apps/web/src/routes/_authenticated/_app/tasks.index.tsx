import { createFileRoute } from '@tanstack/react-router'
import { IssuesPage } from '@/features/issues/components'

export const Route = createFileRoute('/_authenticated/_app/tasks/')({
  component: TasksIndexRoute,
})

function TasksIndexRoute() {
  return <IssuesPage />
}
