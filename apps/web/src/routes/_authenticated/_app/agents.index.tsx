import { createFileRoute } from '@tanstack/react-router'
import { AgentsPage } from '@/features/agents/components'
import { useSurfaceNavigation } from '@/features/navigation/use-surface-navigation'

export const Route = createFileRoute('/_authenticated/_app/agents/')({
  component: AgentsRoute,
})

function AgentsRoute() {
  const { openAgent } = useSurfaceNavigation()
  return <AgentsPage onOpenAgent={openAgent} />
}
