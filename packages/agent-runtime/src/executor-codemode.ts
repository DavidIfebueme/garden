export type ExecutorToolRef = {
  executorSlug: string
  owner: string
  connection: string
  tool: string
}

const TOOL_CALL_PATTERN =
  /tools\.([A-Za-z0-9_-]+)\.(org|user)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_.$-]+?)\s*\(/g

export function extractExecutorToolRefs(code: unknown): ExecutorToolRef[] {
  if (typeof code !== 'string' || code.length === 0) return []
  const refs: ExecutorToolRef[] = []
  const seen = new Set<string>()
  for (const match of code.matchAll(TOOL_CALL_PATTERN)) {
    const [, executorSlug, owner, connection, tool] = match
    if (!executorSlug || !owner || !connection || !tool) continue
    const key = `${executorSlug}.${owner}.${connection}.${tool}`
    if (seen.has(key)) continue
    seen.add(key)
    refs.push({ executorSlug, owner, connection, tool })
  }
  return refs
}

export function extractExecutorToolRefsFromInput(
  input: unknown,
): ExecutorToolRef[] {
  if (typeof input === 'string') return extractExecutorToolRefs(input)
  if (input && typeof input === 'object') {
    try {
      return extractExecutorToolRefs(JSON.stringify(input))
    } catch {
      return []
    }
  }
  return []
}
