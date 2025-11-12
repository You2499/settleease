"use client";

import React, { useState, useEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AISummaryTooltipProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jsonData: any;
  hash: string;
  db?: SupabaseClient;
  currentUserId: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

// Enhanced markdown renderer with comprehensive formatting support
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  interface ListItem {
    text: string;
    level: number;
    type: 'bullet' | 'numbered';
    number?: number;
  }
  
  let currentListItems: ListItem[] = [];
  let inList = false;

  const getIndentLevel = (line: string): number => {
    const match = line.match(/^(\s*)/);
    return match ? Math.floor(match[1].length / 2) : 0;
  };

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(renderNestedList(currentListItems, elements.length));
      currentListItems = [];
    }
    inList = false;
  };

  const renderNestedList = (items: ListItem[], key: number): React.ReactNode => {
    if (items.length === 0) return null;

    const renderListLevel = (items: ListItem[], level: number = 0, parentKey: string = ''): React.ReactNode[] => {
      const result: React.ReactNode[] = [];
      let i = 0;

      while (i < items.length) {
        const item = items[i];
        
        if (item.level === level) {
          const subItems: ListItem[] = [];
          let j = i + 1;
          
          while (j < items.length && items[j].level > level) {
            subItems.push(items[j]);
            j++;
          }

          const itemKey = `${parentKey}-${level}-${i}`;
          const ListTag = item.type === 'numbered' ? 'ol' : 'ul';
          
          // Enhanced styling with better spacing and visual hierarchy
          const listClass = item.type === 'numbered' 
            ? `list-decimal space-y-1.5 ${level === 0 ? 'ml-5' : 'ml-6'}`
            : `list-disc space-y-1.5 ${level === 0 ? 'ml-5' : 'ml-6'}`;
          
          const liClass = `text-sm leading-relaxed ${
            level === 0 ? 'mb-2' : 'mb-1'
          } ${item.type === 'numbered' && level === 0 ? 'font-medium' : ''}`;

          result.push(
            <ListTag key={itemKey} className={listClass}>
              <li className={liClass}>
                <span className="inline-block">
                  {renderInlineMarkdown(item.text)}
                </span>
                {subItems.length > 0 && (
                  <div className="mt-1.5">
                    {renderListLevel(subItems, level + 1, itemKey)}
                  </div>
                )}
              </li>
            </ListTag>
          );

          i = j;
        } else {
          i++;
        }
      }

      return result;
    };

    return <div key={`nested-list-${key}`} className="my-2">{renderListLevel(items)}</div>;
  };

  const renderInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Enhanced regex to handle bold, currency symbols, and special characters
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const matches: Array<{ start: number; end: number; text: string }> = [];
    
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1]
      });
    }
    
    matches.forEach((m, idx) => {
      // Add text before the match
      if (m.start > currentIndex) {
        parts.push(
          <span key={`text-${idx}-before`}>
            {text.substring(currentIndex, m.start)}
          </span>
        );
      }
      
      // Add the bold text with enhanced styling
      parts.push(
        <strong 
          key={`bold-${idx}`} 
          className="font-bold text-primary dark:text-primary-foreground bg-primary/10 dark:bg-primary/20 px-1 rounded"
        >
          {m.text}
        </strong>
      );
      
      currentIndex = m.end;
    });
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.substring(currentIndex)}
        </span>
      );
    }
    
    return parts.length > 0 ? parts : text;
  };

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    const originalLine = line;
    
    // Skip empty lines but add spacing
    if (!trimmedLine) {
      if (elements.length > 0) {
        flushList();
        elements.push(<div key={`space-${lineIndex}`} className="h-3" />);
      }
      return;
    }

    // Headers with enhanced styling and visual hierarchy
    if (trimmedLine.match(/^#{1,4}\s+/)) {
      flushList();
      const headerLevel = trimmedLine.match(/^#+/)?.[0].length || 1;
      const headerText = trimmedLine.replace(/^#+\s+/, '');
      
      const headerClasses = {
        1: "text-xl font-extrabold text-foreground mb-4 mt-6 first:mt-0 pb-2 border-b-2 border-primary/20",
        2: "text-lg font-bold text-foreground mb-3 mt-5 first:mt-0 pb-1.5 border-b border-primary/10", 
        3: "text-base font-semibold text-foreground mb-2.5 mt-4 first:mt-0",
        4: "text-sm font-semibold text-muted-foreground mb-2 mt-3 first:mt-0 uppercase tracking-wide"
      };
      
      const HeaderTag = `h${Math.min(headerLevel, 4)}` as keyof JSX.IntrinsicElements;
      
      elements.push(
        <HeaderTag 
          key={lineIndex} 
          className={headerClasses[headerLevel as keyof typeof headerClasses]}
        >
          {renderInlineMarkdown(headerText)}
        </HeaderTag>
      );
      return;
    }

    // Horizontal rule
    if (trimmedLine.match(/^[-*_]{3,}$/)) {
      flushList();
      elements.push(
        <hr key={lineIndex} className="my-4 border-t border-border" />
      );
      return;
    }

    // Blockquote
    if (trimmedLine.startsWith('>')) {
      flushList();
      const quoteText = trimmedLine.replace(/^>\s*/, '');
      elements.push(
        <blockquote 
          key={lineIndex} 
          className="border-l-4 border-primary/40 pl-4 py-2 my-3 italic text-sm text-muted-foreground bg-muted/30 rounded-r"
        >
          {renderInlineMarkdown(quoteText)}
        </blockquote>
      );
      return;
    }

    const indentLevel = getIndentLevel(originalLine);
    
    // Bullet points with enhanced detection
    if (trimmedLine.match(/^[-*•]\s+/)) {
      const itemText = trimmedLine.replace(/^[-*•]\s+/, '');
      currentListItems.push({
        text: itemText,
        level: indentLevel,
        type: 'bullet'
      });
      inList = true;
      return;
    }

    // Numbered lists with number tracking
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+/);
    if (numberedMatch) {
      const itemText = trimmedLine.replace(/^\d+\.\s+/, '');
      currentListItems.push({
        text: itemText,
        level: indentLevel,
        type: 'numbered',
        number: parseInt(numberedMatch[1])
      });
      inList = true;
      return;
    }

    // Code blocks (inline)
    if (trimmedLine.includes('`')) {
      flushList();
      const parts = trimmedLine.split(/(`[^`]+`)/g);
      const rendered = parts.map((part, idx) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code 
              key={idx} 
              className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{renderInlineMarkdown(part)}</span>;
      });
      
      elements.push(
        <p key={lineIndex} className="text-sm leading-relaxed mb-3">
          {rendered}
        </p>
      );
      return;
    }

    // Regular paragraph with enhanced styling
    flushList();
    elements.push(
      <p key={lineIndex} className="text-sm leading-relaxed mb-3 text-foreground/90">
        {renderInlineMarkdown(trimmedLine)}
      </p>
    );
  });

  flushList();
  return elements;
};

export default function AISummaryTooltip({
  open,
  onOpenChange,
  jsonData,
  hash,
  db,
  currentUserId,
  triggerRef,
}: AISummaryTooltipProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Position tooltip relative to trigger button
  useEffect(() => {
    if (open && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return;
        
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate position
        let top = rect.bottom + 8;
        let left = rect.left;
        
        // Adjust for mobile - center on screen if not enough space
        if (viewportWidth < 768) {
          left = 16; // 16px margin on mobile
          top = Math.min(top, viewportHeight * 0.15); // Don't go too far down
        } else {
          // Desktop positioning
          const tooltipWidth = 600; // Actual tooltip width (updated)
          const tooltipHeight = 500; // Actual tooltip height (updated)
          
          if (left + tooltipWidth > viewportWidth - 16) {
            left = viewportWidth - tooltipWidth - 16;
          }
          if (left < 16) left = 16;
          
          // Ensure tooltip doesn't go below viewport
          if (top + tooltipHeight > viewportHeight - 16) {
            top = rect.top - tooltipHeight - 8; // Position above button
          }
        }
        
        setPosition({ top, left });
      };

      updatePosition();
      
      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open, triggerRef]);

  // Auto-scroll to bottom only when streaming AND we have content (not for skeleton/cached content)
  useEffect(() => {
    if (scrollAreaRef.current && isStreaming && summary) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [summary, isStreaming]);

  // Handle click outside to close (only on desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle click outside on desktop, mobile uses backdrop
      if (window.innerWidth >= 768 && open && tooltipRef.current && triggerRef.current) {
        const target = event.target as Node;
        if (
          !tooltipRef.current.contains(target) &&
          !triggerRef.current.contains(target)
        ) {
          onOpenChange(false);
        }
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, onOpenChange, triggerRef]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, onOpenChange]);

  // Prevent body scroll when tooltip is open (mobile)
  useEffect(() => {
    if (open && window.innerWidth < 768) {
      // Prevent body scroll on mobile
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSummary("");
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [open]);

  // Check for existing summary when dialog opens
  useEffect(() => {
    if (open && hash && db) {
      checkExistingSummary();
    } else if (open && jsonData) {
      // If no db but we have jsonData, fetch new summary
      fetchSummary();
    }
  }, [open, hash, db, jsonData]);

  const checkExistingSummary = async () => {
    if (!hash) {
      console.log("❌ No hash provided, fetching new summary");
      if (jsonData) {
        fetchSummary();
      }
      return;
    }

    console.log("🔍 Checking for existing summary with hash:", hash);

    // Check database for existing summary (regardless of user to save API calls)
    if (db) {
      try {
        const { data, error } = await db
          .from("ai_summaries")
          .select("summary")
          .eq("data_hash", hash)
          .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

        if (error) {
          console.error("❌ Error checking summary:", error);
          // Still try to fetch new summary
          if (jsonData) {
            fetchSummary();
          }
          return;
        }

        if (data && data.summary) {
          console.log("✅ Found cached summary for this data hash, using existing data");
          setSummary(data.summary);
          setIsLoading(false);
          setIsStreaming(false);
          return;
        } else {
          console.log("❌ No cached summary found for this hash");
        }
      } catch (error: any) {
        console.error("❌ Error checking summary:", error);
      }
    } else {
      console.log("❌ No database connection");
    }

    // No existing summary found, fetch new one
    console.log("🚀 Fetching new summary from API");
    if (jsonData) {
      fetchSummary();
    }
  };

  const fetchSummary = async () => {
    if (!jsonData || isLoading) return;

    setIsLoading(true);
    setIsStreaming(true);
    setSummary("");

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jsonData, hash }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let fullSummary = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");

        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullSummary += data.text;
                setSummary(fullSummary);
              }
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.done) {
                // Store summary in database
                await storeSummary(fullSummary, hash);
                setIsStreaming(false);
              }
            } catch (e) {
              // Skip malformed JSON
              console.warn("Failed to parse SSE data:", e);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.text) {
            fullSummary += data.text;
            setSummary(fullSummary);
          }
          if (data.done) {
            await storeSummary(fullSummary, hash);
            setIsStreaming(false);
          }
        } catch (e) {
          // Ignore
        }
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching summary:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const storeSummary = async (summaryText: string, dataHash: string) => {
    if (!summaryText || !dataHash || !db || !currentUserId) {
      console.log("❌ Cannot store summary - missing required data");
      return;
    }

    console.log("💾 Storing summary in database with hash:", dataHash);

    try {
      // First check if a summary with this hash already exists
      const { data: existing } = await db
        .from("ai_summaries")
        .select("id")
        .eq("data_hash", dataHash)
        .maybeSingle();

      if (existing) {
        console.log("✅ Summary already exists for this hash, skipping storage");
        return;
      }

      // Insert new summary (data_hash is now globally unique)
      await db.from("ai_summaries").insert({
        user_id: currentUserId,
        data_hash: dataHash,
        summary: summaryText,
        updated_at: new Date().toISOString(),
      });
      console.log("✅ Summary stored successfully");
    } catch (error: any) {
      // If we get a unique constraint violation, it means another user just stored it
      // This is fine, we can ignore it
      if (error.code === '23505') {
        console.log("✅ Summary was already stored by another user, no action needed");
      } else {
        console.error("❌ Error storing summary in database:", error);
      }
    }
  };



  const renderEnhancedSkeleton = () => {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Main Header - THE BIG PICTURE */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4 bg-slate-300 rounded" />
          <Skeleton className="h-3 w-full bg-slate-200 rounded" />
          <Skeleton className="h-3 w-5/6 bg-slate-200 rounded" />
        </div>

        {/* Section 1: THE ABSOLUTE WINNERS */}
        <div className="space-y-3">
          {/* Section Header */}
          <Skeleton className="h-4 w-2/3 bg-slate-300 rounded" />
          
          {/* Subsection Header */}
          <Skeleton className="h-3 w-1/2 ml-2 bg-slate-250 rounded" />
          
          {/* Main bullet points */}
          <div className="ml-4 space-y-2">
            <div className="flex items-start space-x-2">
              <Skeleton className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0 bg-slate-400" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-4/5 bg-slate-200 rounded" />
                {/* Sub-bullets */}
                <div className="ml-4 space-y-1">
                  <div className="flex items-start space-x-2">
                    <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 bg-slate-300" />
                    <Skeleton className="h-3 w-3/4 bg-slate-100 rounded" />
                  </div>
                  <div className="flex items-start space-x-2">
                    <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 bg-slate-300" />
                    <Skeleton className="h-3 w-2/3 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Skeleton className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/5" />
                {/* Sub-bullet */}
                <div className="ml-4">
                  <div className="flex items-start space-x-2">
                    <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: SPECIFIC EXPENSE STORIES */}
        <div className="space-y-3">
          {/* Section Header */}
          <Skeleton className="h-4 w-3/5 bg-slate-300 rounded" />
          
          {/* Subsection */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-1/2 ml-2" />
            <div className="ml-4 space-y-2">
              <div className="flex items-start space-x-2">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <div className="flex items-start space-x-2">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  {/* Nested items */}
                  <div className="ml-4 space-y-1">
                    <div className="flex items-start space-x-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <div className="flex items-start space-x-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="flex items-start space-x-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: SETTLEMENT STRATEGY */}
        <div className="space-y-3">
          {/* Section Header */}
          <Skeleton className="h-4 w-1/2 bg-slate-300 rounded" />
          
          {/* Subsection Header */}
          <Skeleton className="h-3 w-2/5 ml-2" />
          
          {/* Numbered list */}
          <div className="ml-4 space-y-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-start space-x-3">
                <Skeleton className="h-4 w-4 rounded-sm mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-4/5" />
                  {/* Sub-items for numbered list */}
                  <div className="ml-4 space-y-1">
                    <div className="flex items-start space-x-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    {num === 1 && (
                      <div className="flex items-start space-x-2">
                        <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final paragraph */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  };

  if (!open) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const tooltipWidth = isMobile ? window.innerWidth - 32 : 600; // Increased from 480 to 600
  const tooltipHeight = isMobile ? window.innerHeight * 0.8 : 500; // Increased from 400 to 500
  const tooltipMinHeight = isMobile ? 300 : 300;

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => onOpenChange(false)}
        />
      )}
      
      {/* Floating Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-background border border-border rounded-lg shadow-xl flex flex-col"
        style={{
          top: position.top,
          left: position.left,
          width: tooltipWidth,
          height: tooltipHeight,
          minHeight: tooltipMinHeight,
        }}
        onWheel={(e) => {
          // Stop propagation but don't preventDefault to avoid passive listener error
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">AI Summary</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div 
          className="flex-1 min-h-0 overflow-hidden"
          onWheel={(e) => {
            // Always stop propagation to prevent page scroll
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            // Stop propagation on touch events
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Stop propagation on touch events
            e.stopPropagation();
          }}
        >
          <div 
            ref={scrollAreaRef}
            className="h-full overflow-y-scroll overscroll-contain"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
            }}
            onWheel={(e) => {
              // Stop propagation to prevent page scroll
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              // Prevent touch events from bubbling up
              e.stopPropagation();
            }}
          >
            <div className="p-4">
              {!summary ? (
                <div className="h-full">
                  {renderEnhancedSkeleton()}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="text-left space-y-1" 
                    style={{ 
                      textAlign: 'left',
                      wordWrap: 'break-word'
                    }}
                  >
                    {renderMarkdown(summary)}
                    {isStreaming && (
                      <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse">
                        |
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

