import React, { useState, useMemo, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-full bg-background p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">Pick an Icon</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Search and grid */}
          <div className="flex-1 min-w-0">
            <Input
              autoFocus
              placeholder={`Search ${iconNames.length} icons ...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-6 text-base px-4 py-3 rounded-lg border border-border bg-muted"
            />
            <div
              className="grid gap-4 pb-4 pt-2"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                maxHeight: 500,
                overflowY: 'auto',
                paddingLeft: 4,
                paddingRight: 4,
              }}
            >
              {filteredIconNames.map((iconName) => {
                const Icon = getLucideIconComponent(iconName);
                return (
                  <button
                    key={iconName}
                    onClick={() => onSelect(iconName)}
                    onMouseEnter={() => setPreviewIcon(iconName)}
                    onFocus={() => setPreviewIcon(iconName)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition outline-none border border-transparent hover:bg-accent focus-visible:bg-accent group
                      ${previewIcon === iconName ? 'outline outline-2 outline-primary' : ''}
                    `}
                    style={{ minHeight: 90, marginTop: 2, marginBottom: 2 }}
                    title={iconName}
                    type="button"
                  >
                    <Suspense fallback={<div style={{ width: ICON_SIZE, height: ICON_SIZE }} />}>
                      <Icon width={ICON_SIZE} height={ICON_SIZE} className="mb-2 text-foreground group-hover:text-primary transition-colors" />
                    </Suspense>
                    <span className="text-xs text-center break-words w-full font-mono text-muted-foreground group-hover:text-primary" style={{ wordBreak: 'break-all' }}>{iconName}</span>
                  </button>
                );
              })}
            </div>
            {filteredIconNames.length === 0 && (
              <div className="text-center text-muted-foreground mt-8">No icons found.</div>
            )}
          </div>
          {/* Right: Preview panel */}
          <div className="w-full md:w-80 flex flex-col items-center gap-4 border rounded-lg bg-muted/50 p-6 min-h-[320px] max-h-[420px]" style={{ minWidth: 320, maxWidth: 340, overflow: 'hidden' }}>
            <div className="flex flex-col items-center w-full h-full overflow-y-auto" style={{ minHeight: 0 }}>
              {SelectedIconComp && (
                <Suspense fallback={<div style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }} />}>
                  <SelectedIconComp width={PREVIEW_SIZE} height={PREVIEW_SIZE} className="text-primary" />
                </Suspense>
              )}
              <div className="w-full text-center mt-2 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                <div className="text-lg font-bold mb-1">{selectedIcon}</div>
                {selectedMeta ? (
                  <>
                    <div className="flex flex-wrap justify-center gap-1 mb-2 max-h-32 overflow-y-auto">
                      {selectedMeta.tags?.map((tag: string) => (
                        <span key={tag} className="bg-accent text-xs rounded px-2 py-0.5">{tag}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1 mb-2">
                      {selectedMeta.categories?.map((cat: string) => (
                        <span key={cat} className="bg-muted text-xs rounded px-2 py-0.5 border">{cat}</span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Contributors: {selectedMeta.contributors?.join(', ') || 'Unknown'}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground mt-2">No metadata available for this icon.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 