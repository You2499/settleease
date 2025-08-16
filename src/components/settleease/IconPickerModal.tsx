import React, { useState, useMemo, Suspense } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import * as LucideIcons from 'lucide-react';
import lucideMetadata from '@/lib/lucide-icons-metadata.json';

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
    } catch {}
  }
  async function handleCopyJsx() {
    if (!selectedIcon) return;
    try {
      await navigator.clipboard.writeText(getJsxString(selectedIcon));
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-4xl w-full h-[80vh] max-h-[90vh] bg-background p-0 flex flex-col dark:bg-neutral-900"
        hideCloseButton={false}
      >
        {/* Search Bar */}
        <div className="p-4 pb-0">
          <Input
            autoFocus
            placeholder={`Search ${filteredIconNames.length} icons ...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-base px-4 py-3 rounded-lg border border-border bg-muted dark:bg-neutral-800 dark:border-neutral-700"
          />
        </div>
        {/* Main Content: Icon Grid + Details Panel */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Icon Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-background dark:bg-neutral-900 no-scrollbar">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {filteredIconNames.map((iconName) => {
                const Icon = getLucideIconComponent(iconName);
                return (
                  <button
                    key={iconName}
                    onClick={() => onSelect(iconName)}
                    onMouseEnter={() => setPreviewIcon(iconName)}
                    onFocus={() => setPreviewIcon(iconName)}
                    onMouseLeave={() => setPreviewIcon(null)}
                    className={`group flex flex-col items-center justify-center p-2 rounded-lg transition outline-none border-2 border-transparent focus-visible:border-primary hover:border-primary ${previewIcon === iconName ? 'border-primary' : ''}`}
                    title={iconName}
                    type="button"
                  >
                    <Suspense fallback={<div style={{ width: ICON_SIZE, height: ICON_SIZE }} />}> 
                      <Icon width={ICON_SIZE} height={ICON_SIZE} className="text-foreground group-hover:text-primary transition-colors" />
                    </Suspense>
                    <span className="mt-1 text-xs text-muted-foreground truncate w-full text-center">{iconName}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Details/Preview Panel */}
          <div className="w-full md:w-[340px] flex-shrink-0 flex flex-col items-center justify-center min-h-[220px] max-h-full overflow-y-auto no-scrollbar p-6">
            <div className="w-full h-full">
              <div className="rounded-lg bg-card/50 shadow-sm border border-border p-4 flex flex-col items-center h-full justify-center">
                {SelectedIconComp && (
                  <div className="flex flex-col items-center gap-2 w-full">
                    <Suspense fallback={<div style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }} />}> 
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
        </div>
      </DialogContent>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
    </Dialog>
  );
} 