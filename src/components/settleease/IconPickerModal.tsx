import React, { useState, useMemo, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import * as LucideIcons from 'lucide-react';

const ICON_SIZE = 32;

// Only include Lucide icon exports that do NOT end with 'Icon' and are valid components
const iconNames = Object.keys(LucideIcons).filter(
  (name) => {
    if (name.endsWith('Icon')) return false;
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

  const filteredIconNames = useMemo(
    () =>
      iconNames.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-full bg-background p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">Pick an Icon</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={`Search ${iconNames.length} icons ...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6 text-base px-4 py-3 rounded-lg border border-border bg-muted"
        />
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
            maxHeight: 500,
            overflowY: 'auto',
          }}
        >
          {filteredIconNames.map((iconName) => {
            const Icon = getLucideIconComponent(iconName);
            return (
              <button
                key={iconName}
                onClick={() => onSelect(iconName)}
                className="flex flex-col items-center justify-center p-3 rounded-lg transition border border-transparent hover:border-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none group"
                style={{ minHeight: 90 }}
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
      </DialogContent>
    </Dialog>
  );
} 