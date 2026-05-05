import React, { useState, useMemo, Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Shapes } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import lucideMetadata from '@/lib/lucide-icons-metadata.json';
import SettleEaseDialog, {
  SettleEaseModalHeader,
  SettleEaseModalSection,
  SettleEaseModalToolBody,
} from './SettleEaseDialog';

const ICON_SIZE = 32;
const PREVIEW_SIZE = 96;

// Only include Lucide icon exports that do NOT end with 'Icon', do NOT start with 'Lucide', and are valid components
const iconNames = Object.keys(LucideIcons).filter(
  (name) => {
    if (name.endsWith('Icon')) return false;
    if (name.startsWith('Lucide')) return false;
    const Component = (LucideIcons as any)[name];
    return typeof Component === 'object' && Component !== null && !!Component.displayName;
  }
);

function getLucideIconComponent(iconName: string) {
  return (LucideIcons as any)[iconName] as React.FC<React.SVGProps<SVGSVGElement>>;
}

function toKebabCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

interface IconPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  initialSearch?: string;
}

export default function IconPickerModal({ open, onClose, onSelect, initialSearch = '' }: IconPickerModalProps) {
  const [search, setSearch] = useState(initialSearch);
  const [previewIcon, setPreviewIcon] = useState<string | null>(null);

  // Hybrid search: if metadata exists, search by name/tags/categories; else, search by name only
  const filteredIconNames = useMemo(
    () =>
      iconNames.filter((name) => {
        const meta = (lucideMetadata as any)[name];
        const searchLower = search.toLowerCase();
        if (meta) {
          return (
            name.toLowerCase().includes(searchLower) ||
            (meta?.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))) ||
            (meta?.categories?.some((cat: string) => cat.toLowerCase().includes(searchLower)))
          );
        } else {
          return name.toLowerCase().includes(searchLower);
        }
      }),
    [search]
  );

  // For preview panel
  const selectedIcon = previewIcon || filteredIconNames[0];
  const SelectedIconComp = selectedIcon ? getLucideIconComponent(selectedIcon) : null;
  const selectedMeta = selectedIcon ? (lucideMetadata as any)[selectedIcon] : null;

  // Get SVG string for copy
  function getSvgString(iconName: string) {
    const Icon = getLucideIconComponent(iconName);
    // Render to string (simple, not SSR-safe, but works for Lucide icons)
    return `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">${(Icon as any).iconNode?.map((n: any) => `<${n[0]} ${Object.entries(n[1]).map(([k, v]) => `${k}=\"${v}\"`).join(' ')} />`).join('') || ''}</svg>`;
  }

  // Get JSX string for copy
  function getJsxString(iconName: string) {
    return `<${iconName} />`;
  }

  async function handleCopySvg() {
    if (!selectedIcon) return;
    try {
      await navigator.clipboard.writeText(getSvgString(selectedIcon));
    } catch { }
  }
  async function handleCopyJsx() {
    if (!selectedIcon) return;
    try {
      await navigator.clipboard.writeText(getJsxString(selectedIcon));
    } catch { }
  }

  return (
    <SettleEaseDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      className="h-[calc(100dvh-1rem)] sm:h-[760px] sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl"
    >
      <div className="flex h-full min-h-0 flex-col">
        <SettleEaseModalHeader
          icon={Shapes}
          tone="brand"
          title="Choose an icon"
          description="Search the Lucide library and pick the symbol for this category."
        />

        <SettleEaseModalToolBody className="flex flex-col gap-3">
          <div className="relative shrink-0">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={`Search ${filteredIconNames.length} icons ...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-full border-border bg-background pl-10 text-sm"
            />
          </div>

          {SelectedIconComp && (
            <SettleEaseModalSection className="flex shrink-0 items-center gap-3 p-3 md:hidden">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border bg-muted/25">
                <Suspense fallback={<Skeleton className="h-8 w-8 rounded" />}>
                  <SelectedIconComp width={32} height={32} className="text-primary" />
                </Suspense>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{toKebabCase(selectedIcon)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedMeta?.tags?.slice(0, 3).join(", ") || "Selected preview"}
                </p>
              </div>
            </SettleEaseModalSection>
          )}

          <div className="grid min-h-0 flex-1 gap-3 overflow-hidden md:grid-cols-[minmax(0,1fr)_320px]">
            <SettleEaseModalSection className="flex min-h-0 flex-col overflow-hidden p-0">
              <div className="shrink-0 border-b bg-muted/30 px-3 py-2.5">
                <div className="flex items-center space-x-2">
                  <Shapes className="h-4 w-4" />
                  <span className="font-medium text-sm text-foreground">Icon Library</span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                    {filteredIconNames.map((iconName) => {
                      const Icon = getLucideIconComponent(iconName);
                      return (
                        <button
                          key={iconName}
                          onClick={() => onSelect(iconName)}
                          onMouseEnter={() => setPreviewIcon(iconName)}
                          onFocus={() => setPreviewIcon(iconName)}
                          onMouseLeave={() => setPreviewIcon(null)}
                          className={`group flex min-w-0 flex-col items-center justify-center rounded-lg border border-transparent p-2 outline-none transition hover:border-primary/50 hover:bg-muted/35 focus-visible:border-primary ${previewIcon === iconName ? 'border-primary bg-muted/45' : ''}`}
                          title={iconName}
                          type="button"
                        >
                          <Suspense fallback={<Skeleton className="rounded" style={{ width: ICON_SIZE, height: ICON_SIZE }} />}>
                            <Icon width={ICON_SIZE} height={ICON_SIZE} className="text-foreground group-hover:text-primary transition-colors" />
                          </Suspense>
                          <span className="mt-1 w-full truncate text-center text-xs text-muted-foreground">{iconName}</span>
                        </button>
                      );
                    })}
                  </div>
              </div>
            </SettleEaseModalSection>

            <SettleEaseModalSection className="hidden min-h-0 overflow-hidden p-0 md:flex md:flex-col">
              <div className="shrink-0 border-b bg-muted/30 px-3 py-2.5">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span className="font-medium text-sm text-foreground">Preview</span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 no-scrollbar">
                  <div className="h-full w-full">
                    <div className="flex min-h-full flex-col items-center justify-center rounded-xl border bg-muted/25 p-3 shadow-sm">
                      {SelectedIconComp && (
                        <div className="flex flex-col items-center gap-2 w-full">
                          <Suspense fallback={<Skeleton className="rounded-lg" style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }} />}>
                            <SelectedIconComp width={PREVIEW_SIZE} height={PREVIEW_SIZE} className="text-primary" />
                          </Suspense>
                          <div className="text-base font-bold mt-1 text-foreground dark:text-white text-center w-full truncate">{toKebabCase(selectedIcon)}</div>
                          {selectedMeta && selectedMeta.tags && selectedMeta.tags.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 mb-1 w-full">
                              {selectedMeta.tags.map((tag: string) => (
                                <span key={tag} className="bg-accent text-xs rounded px-2 py-0.5 dark:bg-neutral-800 dark:text-white">{tag}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 mt-2 w-full justify-center">
                            <button onClick={handleCopySvg} className="px-3 py-1 rounded bg-primary text-white text-xs hover:bg-primary/90 transition">Copy SVG</button>
                            <a href={`https://lucide.dev/icon/${toKebabCase(selectedIcon)}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded bg-accent text-xs text-foreground hover:bg-accent/80 transition dark:bg-neutral-800 dark:text-white">See in action</a>
                          </div>
                          {/* Optionally show categories/contributors in a collapsible/less prominent way */}
                          {selectedMeta && selectedMeta.categories && selectedMeta.categories.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 mt-2 w-full">
                              {selectedMeta.categories.map((cat: string) => (
                                <span key={cat} className="bg-muted text-xs rounded px-2 py-0.5 border dark:bg-neutral-800 dark:text-white dark:border-neutral-700">{cat}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
              </div>
            </SettleEaseModalSection>
          </div>
        </SettleEaseModalToolBody>
      </div>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
    </SettleEaseDialog>
  );
}
