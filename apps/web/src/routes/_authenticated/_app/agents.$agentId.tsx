import { createFileRoute } from '@tanstack/react-router'
import { AgentDetail } from '@/features/agents/components'
import { useSurfaceNavigation } from '@/features/navigation/use-surface-navigation'

export const Route = createFileRoute('/_authenticated/_app/agents/$agentId')({
  component: AgentDetailRoute,
})

function AgentDetailRoute() {
  const { agentId } = Route.useParams()
  const { openSkill } = useSurfaceNavigation()
  return <AgentDetail agentId={agentId} onOpenSkill={openSkill} />
}
