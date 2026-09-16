import { createFileRoute } from '@tanstack/react-router'
import { SkillsPage } from '@/features/skills/components'

export const Route = createFileRoute('/_authenticated/_app/skills')({
  // ?focus=<skillId> opens a skill directly (replaces the dock's entityId).
  validateSearch: (search) => {
    const out: { focus?: string } = {}
    if (typeof search.focus === 'string') out.focus = search.focus
    return out
  },
  component: SkillsRoute,
})

function SkillsRoute() {
  const { focus } = Route.useSearch()
  return <SkillsPage focusedSkillId={focus} />
}
