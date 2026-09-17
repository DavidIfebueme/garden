import {
  Brain,
  Equalizer,
  FileMagnifyingGlass,
  FileText,
  GearFine,
} from '@phosphor-icons/react'
import {
  BinocularsIcon,
  CalendarCheckIcon,
  ChartBarIcon,
  DatabaseIcon,
  FileDocIcon,
  GithubIcon,
  GmailIcon,
  GoogleDriveIcon,
  ImagesSquareIcon,
  NotionIcon,
  SlackIcon,
  SlidersHorizontalIcon,
  VectorThreeIcon,
  type IconComponent,
} from '@garden/ui/components/icons'

/**
 * Static config for the composer's tools popover, suggestion pills, and folder
 * selector. The tools + folders have no backend yet (2026-09-08 spec, verdict
 * D: build the UI as designed, backend later). This file is the single source
 * of truth for those lists so UI, tests, and any future wiring agree.
 */

export type ToolPresetId =
  | 'qa-agent'
  | 'eng-issue-triage'
  | 'org-brain'
  | 'research-synthesis'
  | 'document-review'
  | 'default'

export interface ToolPreset {
  id: ToolPresetId
  label: string
  /**
   * Typed `IconComponent` rather than lucide's `LucideIcon`: the presets draw
   * from Phosphor (already a dependency, used across the shell and brain
   * features) plus this repo's own hand-authored set, so the registry has to
   * hold both.
   */
  icon: IconComponent
  /**
   * Per-preset accent colour for the icon, as Tailwind text classes. The
   * design gives each preset its own hue rather than a single muted icon
   * colour, and the hue is the only thing distinguishing the two
   * file-shaped glyphs at a glance. Raw palette classes with a lighter dark
   * variant, matching how the rest of the app tints one-off accents (see
   * `chat-artifacts.tsx`, `automation-detail-page.tsx`) — there are no
   * semantic tokens for these hues.
   */
  iconClassName: string
  /**
   * Tint for the composer's tools trigger while this preset is selected, as
   * Tailwind background classes. The footer shows the active preset as a
   * tinted pill (2026-09-17 composer-field board) so the current tool is
   * readable without opening the menu; `default` carries no tint because it
   * is the resting state, not a choice the person made.
   */
  accentClassName: string
}

/**
 * The six presets, in the order the tools menu lists them (Default first,
 * then most-to-least general). This order is the design's, not alphabetical
 * or definition order, and the menu renders the array as-is.
 */
export const TOOL_PRESETS: readonly ToolPreset[] = [
  {
    id: 'default',
    label: 'Default',
    icon: SlidersHorizontalIcon,
    iconClassName: 'text-icon-default',
    accentClassName: '',
  },
  {
    id: 'qa-agent',
    label: 'QA Agent',
    icon: Equalizer,
    iconClassName: 'text-orange-500 dark:text-orange-400',
    accentClassName: 'bg-orange-500/10 dark:bg-orange-400/15',
  },
  {
    id: 'eng-issue-triage',
    label: 'Engineering Issue Triage',
    icon: GearFine,
    iconClassName: 'text-blue-500 dark:text-blue-400',
    accentClassName: 'bg-blue-500/10 dark:bg-blue-400/15',
  },
  {
    id: 'org-brain',
    label: 'Org. Brain',
    icon: Brain,
    iconClassName: 'text-purple-500 dark:text-purple-400',
    accentClassName: 'bg-purple-500/10 dark:bg-purple-400/15',
  },
  {
    id: 'research-synthesis',
    label: 'Research Synthesis',
    icon: FileMagnifyingGlass,
    iconClassName: 'text-fuchsia-500 dark:text-fuchsia-400',
    accentClassName: 'bg-fuchsia-500/10 dark:bg-fuchsia-400/15',
  },
  {
    id: 'document-review',
    label: 'Document Review',
    icon: FileText,
    iconClassName: 'text-blue-500 dark:text-blue-400',
    accentClassName: 'bg-blue-500/10 dark:bg-blue-400/15',
  },
]

export const DEFAULT_TOOL_PRESET_ID: ToolPresetId = 'default'

/**
 * The presets that draw on external documents. While one of these is
 * selected the composer footer shows a `Sources` control beside the tools
 * trigger (`composer-sources-menu.tsx`); the other three work off the thread
 * alone and the control is absent, not disabled.
 *
 * A `Set` rather than a flag on `ToolPreset` because "has sources" is a fact
 * about what the footer shows, not about the preset itself — nothing else in
 * the app branches on it.
 */
export const TOOL_PRESET_IDS_WITH_SOURCES: ReadonlySet<ToolPresetId> = new Set([
  'org-brain',
  'research-synthesis',
  'document-review',
])

export interface SuggestionPill {
  id: string
  label: string
  /**
   * Typed `IconComponent`, not `LucideIcon`: these are the product's own
   * fill icons rather than lucide glyphs. The wider type also lets a pill
   * fall back to a lucide icon if a drawn one is ever missing.
   */
  icon: IconComponent
  /** Prefilled into the composer draft on click (same behavior as the old tiles). */
  starter: string
}

export const SUGGESTION_PILLS: readonly SuggestionPill[] = [
  {
    id: 'draft-document',
    label: 'Draft a document',
    icon: FileDocIcon,
    starter: 'Help me draft a document about ',
  },
  {
    id: 'org-knowledge',
    label: 'Org. knowledge',
    icon: DatabaseIcon,
    starter: 'What does the org know about ',
  },
  {
    id: 'plan-activity',
    label: 'Plan & track your activity',
    icon: VectorThreeIcon,
    starter: 'Help me plan and track my work. Here is what is on my plate: ',
  },
  {
    id: 'structure-calendar',
    label: 'Structure calendar',
    icon: CalendarCheckIcon,
    starter: 'Help me structure my calendar for ',
  },
  {
    id: 'generate-images',
    label: 'Generate images',
    icon: ImagesSquareIcon,
    starter: 'Generate an image of ',
  },
  {
    id: 'deep-research',
    label: 'Deep research',
    icon: BinocularsIcon,
    starter: 'Do deep research on ',
  },
  {
    id: 'analyse-data',
    label: 'Analyse data',
    icon: ChartBarIcon,
    starter: 'Help me analyse this data: ',
  },
]

export interface FolderStubItem {
  id: string
  label: string
}

/**
 * Placeholder folders. No folder data model exists anywhere in the app yet;
 * this list only fills the selector so the design reads correctly.
 */
export const FOLDER_STUB: readonly FolderStubItem[] = [
  { id: 'recent', label: 'Recent work' },
  { id: 'planning', label: 'Planning' },
  { id: 'research', label: 'Research' },
  { id: 'new', label: 'New folder…' },
]

export const NEW_FOLDER_STUB_ID = 'new'

export interface ConnectedAppStubItem {
  id: string
  label: string
  icon: IconComponent
}

/**
 * Placeholder app integrations for the composer's "Connect your apps" section.
 * Shown when no integrations are connected yet (same pattern as FOLDER_STUB).
 */
export const CONNECT_APPS_STUB: readonly ConnectedAppStubItem[] = [
  { id: 'notion', label: 'Notion', icon: NotionIcon },
  { id: 'slack', label: 'Slack', icon: SlackIcon },
  { id: 'gmail', label: 'Gmail', icon: GmailIcon },
  { id: 'github', label: 'GitHub', icon: GithubIcon },
]

export const CONNECTED_APPS_STUB = CONNECT_APPS_STUB

/**
 * The sources the footer's `Sources` menu offers while a sources-backed
 * preset is selected. Same providers as `CONNECT_APPS_STUB` plus Google
 * Drive; kept as its own list
 * rather than extending that one because `CONNECT_APPS_STUB` also feeds the
 * extension row's icon strip, which is capped at four icons
 * (`MAX_CONNECTION_ICONS`) and would silently drop whichever entry a fifth
 * one pushed past the cap.
 *
 * Every row renders as "not connected" with a Connect action, which is the
 * designed state and not a placeholder for live status. Real connection
 * status is available (`connectionListOptions`, as the extension row uses),
 * but matching an `ExecutorIntegrationItem.slug` to these ids is a guess
 * until the executor's provider slugs are confirmed — a wrong match would
 * show "Connect" on an app that is already connected. Connecting is handled
 * by the Connections route either way, which is where the row's click goes.
 */
export const TOOL_SOURCE_STUB: readonly ConnectedAppStubItem[] = [
  { id: 'notion', label: 'Notion', icon: NotionIcon },
  { id: 'slack', label: 'Slack', icon: SlackIcon },
  { id: 'gmail', label: 'Gmail', icon: GmailIcon },
  { id: 'github', label: 'GitHub', icon: GithubIcon },
  { id: 'google-drive', label: 'Google Drive', icon: GoogleDriveIcon },
]
