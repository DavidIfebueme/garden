import { createFileRoute } from '@tanstack/react-router'
import { InboxPage } from '@/features/inbox'

export const Route = createFileRoute('/_authenticated/_app/inbox')({
  component: InboxRoute,
})

function InboxRoute() {
  return <InboxPage />
}
