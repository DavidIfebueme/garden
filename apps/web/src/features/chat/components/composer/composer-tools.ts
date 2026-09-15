import {
  BarChart3,
  Bot,
  BrainCircuit,
  FileText,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import {
  BinocularsIcon,
  CalendarCheckIcon,
  ChartBarIcon,
  DatabaseIcon,
  FileDocIcon,
  GithubIcon,
  GmailIcon,
  ImagesSquareIcon,
  NotionIcon,
  SlackIcon,
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
  icon: LucideIcon
}

export const TOOL_PRESETS: readonly ToolPreset[] = [
  { id: 'qa-agent', label: 'QA Agent', icon: BarChart3 },
  { id: 'eng-issue-triage', label: 'Engineering Issue Triage', icon: Bot },
  { id: 'org-brain', label: 'Org. Brain', icon: BrainCircuit },
  { id: 'research-synthesis', label: 'Research Synthesis', icon: ScrollText },
  { id: 'document-review', label: 'Document Review', icon: FileText },
  { id: 'default', label: 'Default', icon: Sparkles },
]

export const DEFAULT_TOOL_PRESET_ID: ToolPresetId = 'default'

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
