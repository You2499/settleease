import React, { useState, useMemo, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FixedSizeGrid as Grid } from 'react-window';

// Lucide icon names are PascalCase, and all are exported from lucide-react
import * as LucideIcons from 'lucide-react';

const ICON_SIZE = 32;
const COLUMN_COUNT = 6;
const ICON_PADDING = 12;

// Get all Lucide icon names (filter out non-icon exports)
const iconNames = Object.keys(LucideIcons).filter(
  (name) => typeof (LucideIcons as any)[name] === 'function'
);

function getLucideIconComponent(iconName: string) {
  // Dynamic import for code splitting
  return React.lazy(() =>
    import(`lucide-react/lib/esm/icons/${iconName.toLowerCase()}.js`).catch(() =>
      Promise.resolve({ default: (LucideIcons as any)[iconName] })
    )
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
              const Icon = getLucideIconComponent(iconName);
              return (
                <div
                  style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  key={iconName}
                  onClick={() => onSelect(iconName)}
                  title={iconName}
                >
                  <Suspense fallback={<div style={{ width: ICON_SIZE, height: ICON_SIZE }} />}> 
                    <Icon size={ICON_SIZE} />
                  </Suspense>
                  <span style={{ fontSize: 10, marginTop: 4, textAlign: 'center', width: ICON_SIZE + 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iconName}</span>
                </div>
              );
            }}
          </Grid>
        </div>
      </DialogContent>
    </Dialog>
  );
} 