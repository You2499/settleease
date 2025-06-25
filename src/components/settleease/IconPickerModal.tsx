import React, { useState, useMemo, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FixedSizeGrid as Grid } from 'react-window';

// Lucide icon names are PascalCase, and all are exported from lucide-react
import * as LucideIcons from 'lucide-react';

const ICON_SIZE = 28;
const COLUMN_COUNT = 12;
const ICON_PADDING = 16;

// Get all Lucide icon names (filter out non-icon exports and deduplicate)
const iconNames = [...new Set(Object.keys(LucideIcons).filter(
  (name) => {
    const Component = (LucideIcons as any)[name];
    // Lucide icons are memoized components (objects) and have a displayName.
    return typeof Component === 'object' && Component !== null && !!Component.displayName;
  }
))];

function getLucideIconComponent(iconName: string) {
  return React.lazy(() =>
    import('lucide-react').then(mod => ({ default: (mod as any)[iconName] }))
  );
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

  const rowCount = Math.ceil(filteredIconNames.length / COLUMN_COUNT);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>Pick an Icon</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Search icons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
        <div style={{ width: '100%', height: 400 }}>
          <Grid
            columnCount={COLUMN_COUNT}
            columnWidth={ICON_SIZE + ICON_PADDING}
            height={400}
            rowCount={rowCount}
            rowHeight={ICON_SIZE + 32}
            width={COLUMN_COUNT * (ICON_SIZE + ICON_PADDING)}
          >
            {({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
              const index = rowIndex * COLUMN_COUNT + columnIndex;
              if (index >= filteredIconNames.length) return null;
              const iconName = filteredIconNames[index];
              const Icon = getLucideIconComponent(iconName) as unknown as React.FC<React.SVGProps<SVGSVGElement>>;
              return (
                <div
                  style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer', paddingTop: 8 }}
                  key={iconName}
                  onClick={() => onSelect(iconName)}
                  title={iconName}
                >
                  <Suspense fallback={<div style={{ width: ICON_SIZE, height: ICON_SIZE }} />}> 
                    <Icon width={ICON_SIZE} height={ICON_SIZE} />
                  </Suspense>
                  <span style={{ fontSize: 10, marginTop: 6, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>{iconName}</span>
                </div>
              );
            }}
          </Grid>
        </div>
      </DialogContent>
    </Dialog>
  );
} 