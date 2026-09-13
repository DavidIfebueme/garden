import { useState } from 'react';
import type { ReactElement } from 'react';
import {
  ArrowUp,
  Bold,
  Check,
  ChevronDown,
  Code2,
  Heading,
  Italic,
  Mic,
  Plus,
  SlidersHorizontal,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Underline,
} from 'lucide-react';
import { Icon as IconifyIcon } from '@iconify/react';

const HighlighterIcon = ({ className }: { className?: string }) => (
  <IconifyIcon
    icon="ph:highlighter-thin"
    className={className}
    style={{ width: '1em', height: '1em' }}
  />
);

const HarnessyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 18 23.995"
    fill="none"
    className={className}
  >
    <path
      d="M5.7841796875,12.638671875L11.5703125,18.31640625L5.7841796875,23.9951171875L0,18.31640625L5.7841796875,12.638671875ZM12.21435546875,6.32421875L18,12.00390625L12.21435546875,17.681640625L6.4296875,12.001953125L12.21435546875,6.32421875ZM5.7841796875,0L11.5703125,5.6796875L5.7841796875,11.357421875L0,5.677734375L5.7841796875,0Z"
      fill="#772CE8"
    />
  </svg>
);

const toolbarGroups = [
  [HighlighterIcon, Underline, Code2],
  [Bold, Italic, Heading],
  [TextAlignCenter, TextAlignStart, TextAlignEnd, TextAlignJustify],
];

const models = [
  { id: 'harnessy', label: 'Harnessy', Icon: HarnessyIcon },
  { id: 'harnessy-pro', label: 'Harnessy Pro', Icon: HarnessyIcon },
  { id: 'harnessy-fast', label: 'Harnessy Fast', Icon: HarnessyIcon },
] as const;

export type ModelId = (typeof models)[number]['id'];

type ModelOption<T extends string> = {
  id: T;
  label: string;
  Icon: (props: { className?: string }) => ReactElement;
};

function ModelPicker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (id: T) => void;
  options: readonly ModelOption<T>[];
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((m) => m.id === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full bg-muted px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent"
      >
        <current.Icon className="h-4 w-auto" />
        {current.label}
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            className="absolute bottom-full right-0 z-20 mb-2 min-w-45 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
          >
            {options.map(({ id, label, Icon }) => {
              const selected = id === value;
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(id);
                      setOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <Icon className="h-4 w-auto" />
                    <span className="flex-1">{label}</span>
                    {selected && <Check className="size-3.5 text-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function InboxReplyInput() {
  const [model, setModel] = useState<ModelId>('harnessy');

  return (
    <div className="rounded-[28px] border border-border bg-background p-4">
      <div className="flex items-center gap-4 text-muted-foreground">
        {toolbarGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-4">
            {groupIndex > 0 && (
              <span className="h-4 w-px bg-border" aria-hidden="true" />
            )}
            {group.map((Icon, index) => (
              <button
                key={index}
                type="button"
                className="inline-flex size-4 cursor-pointer items-center justify-center transition-colors hover:text-foreground"
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        ))}
      </div>

      <textarea
        className="mt-4 h-16 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        placeholder="Write your reply here..."
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs font-medium text-foreground">
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center text-foreground transition-colors hover:text-muted-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center text-foreground transition-colors hover:text-muted-foreground"
          >
            <SlidersHorizontal className="size-4" />
          </button>
          <span>Default</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mic className="size-3.5" />
          </button>

          <ModelPicker value={model} onChange={setModel} options={models} />

          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}