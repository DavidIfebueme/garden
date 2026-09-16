import { useTheme } from 'next-themes'
import { cn } from '@garden/ui/lib/utils'

/**
 * Preview swatches mirror the token system's semantic surfaces — light content
 * is background.main.default (white.1000), dark content is gray.900, sidebars
 * are main.secondary, bars are neutral fills. Literal hexes are intentional:
 * CSS vars can't dual-preview light and dark in one page (they scope at root),
 * so keep these in sync with tokens.json if the palette changes.
 */
const LIGHT_COLORS = {
  titleBar: '#f5f5f5', // gray.100
  content: '#ffffff', // background.main.default
  sidebar: '#f5f5f5', // background.main.secondary
  bar: '#d9d9d9', // gray.300
  barMuted: '#e6e6e6', // gray.200
  accent: '#012f1d', // brand.800 — primary CTA
}

const DARK_COLORS = {
  titleBar: '#2c2c2c', // gray.800
  content: '#1e1e1e', // background.main.default (dark)
  sidebar: '#2c2c2c', // background.main.secondary (dark)
  bar: '#444444', // gray.600
  barMuted: '#383838', // gray.700
  accent: '#8efed3', // brand.200 — accent on dark
}

function WindowMockup({
  variant,
  className,
}: {
  variant: 'light' | 'dark'
  className?: string
}) {
  const colors = variant === 'light' ? LIGHT_COLORS : DARK_COLORS

  return (
    <div className={cn('flex h-full w-full flex-col', className)}>
      {/* Title bar */}
      <div
        className="flex items-center gap-[3px] px-2 py-1.5"
        style={{ backgroundColor: colors.titleBar }}
      >
        <span className="size-[6px] rounded-full bg-[#ff5f57]" />
        <span className="size-[6px] rounded-full bg-[#febc2e]" />
        <span className="size-[6px] rounded-full bg-[#28c840]" />
      </div>
      {/* Content area */}
      <div className="flex flex-1" style={{ backgroundColor: colors.content }}>
        {/* Sidebar */}
        <div
          className="w-[30%] space-y-1 p-2"
          style={{ backgroundColor: colors.sidebar }}
        >
          <div
            className="h-1 w-3/4 rounded-full"
            style={{ backgroundColor: colors.bar }}
          />
          <div
            className="h-1 w-1/2 rounded-full"
            style={{ backgroundColor: colors.bar }}
          />
        </div>
        {/* Main */}
        <div className="flex-1 space-y-1.5 p-2">
          <div
            className="h-1.5 w-4/5 rounded-full"
            style={{ backgroundColor: colors.bar }}
          />
          <div
            className="h-1 w-full rounded-full"
            style={{ backgroundColor: colors.barMuted }}
          />
          <div
            className="h-2 w-2/5 rounded-full"
            style={{ backgroundColor: colors.accent }}
          />
        </div>
      </div>
    </div>
  )
}

const themeOptions = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
]

export function AppearanceTab() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-12">
      <section className="space-y-5">
        <header className="space-y-1">
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            How Garden looks on this device.
          </p>
        </header>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-5 border-t pt-5"
          role="radiogroup"
          aria-label="Theme"
        >
          {themeOptions.map((opt) => {
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                aria-label={`Select ${opt.label} theme`}
                onClick={() => setTheme(opt.value)}
                className="group flex cursor-pointer flex-col items-start gap-3 rounded-xl text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand/60"
              >
                <div
                  className={cn(
                    'aspect-[4/3] w-full overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-150',
                    active
                      ? 'border-brand/50 ring-2 ring-brand/80 shadow-[0_12px_28px_-18px_color-mix(in_oklab,var(--brand)_75%,transparent)]'
                      : 'border-border hover:border-brand/25 hover:bg-accent/30 hover:shadow-md',
                  )}
                >
                  {opt.value === 'system' ? (
                    <div className="relative h-full w-full">
                      <WindowMockup
                        variant="light"
                        className="absolute inset-0"
                      />
                      <WindowMockup
                        variant="dark"
                        className="absolute inset-0 [clip-path:inset(0_0_0_50%)]"
                      />
                    </div>
                  ) : (
                    <WindowMockup variant={opt.value} />
                  )}
                </div>
                <div className="space-y-1">
                  <div
                    className={cn(
                      'text-[0.95rem] transition-colors',
                      active
                        ? 'font-semibold text-foreground'
                        : 'font-medium text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
