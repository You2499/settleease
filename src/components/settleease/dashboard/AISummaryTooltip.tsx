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

// Enhanced markdown renderer with support for headers, lists, bold text, and proper formatting
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentListItems: string[] = [];
  let currentNumberedItems: string[] = [];
  let listType: 'bullet' | 'numbered' | null = null;

  const flushList = () => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside ml-4 mb-3 space-y-1">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      currentListItems = [];
    }
    if (currentNumberedItems.length > 0) {
      elements.push(
        <ol key={`ol-${elements.length}`} className="list-decimal list-inside ml-4 mb-3 space-y-1">
          {currentNumberedItems.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ol>
      );
      currentNumberedItems = [];
    }
    listType = null;
  };

  const renderInlineMarkdown = (text: string) => {
    // Handle bold text (**text** and *text*)
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/);
    
    return parts.map((part, index) => {
      // Handle **text** (double asterisk)
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Handle *text* (single asterisk) - but not if it's a list marker
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2 && !part.match(/^\*\s/)) {
        return (
          <strong key={index} className="font-bold text-primary">
            {part.slice(1, -1)}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines but add spacing
    if (!trimmedLine) {
      if (elements.length > 0) {
        flushList();
        elements.push(<div key={`space-${lineIndex}`} className="mb-2" />);
      }
      return;
    }

    // Headers (# ## ###)
    if (trimmedLine.match(/^#{1,3}\s+/)) {
      flushList();
      const headerLevel = trimmedLine.match(/^#+/)?.[0].length || 1;
      const headerText = trimmedLine.replace(/^#+\s+/, '');
      
      const headerClasses = {
        1: "text-lg font-bold text-foreground mb-3 mt-4 first:mt-0",
        2: "text-base font-bold text-foreground mb-2 mt-3 first:mt-0", 
        3: "text-sm font-semibold text-foreground mb-2 mt-2 first:mt-0"
      };
      
      const HeaderTag = `h${Math.min(headerLevel, 3)}` as keyof JSX.IntrinsicElements;
      
      elements.push(
        <HeaderTag key={lineIndex} className={headerClasses[headerLevel as keyof typeof headerClasses]}>
          {renderInlineMarkdown(headerText)}
        </HeaderTag>
      );
      return;
    }

    // Bullet points (- or *)
    if (trimmedLine.match(/^[-*]\s+/)) {
      if (listType === 'numbered') {
        flushList();
      }
      listType = 'bullet';
      const itemText = trimmedLine.replace(/^[-*]\s+/, '');
      currentListItems.push(itemText);
      return;
    }

    // Numbered lists (1. 2. etc.)
    if (trimmedLine.match(/^\d+\.\s+/)) {
      if (listType === 'bullet') {
        flushList();
      }
      listType = 'numbered';
      const itemText = trimmedLine.replace(/^\d+\.\s+/, '');
      currentNumberedItems.push(itemText);
      return;
    }

    // Regular paragraph text
    flushList();
    elements.push(
      <p key={lineIndex} className="text-sm leading-relaxed mb-3 text-left">
        {renderInlineMarkdown(trimmedLine)}
      </p>
    );
  });

  // Flush any remaining list items
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
          const tooltipWidth = 480; // Actual tooltip width
          if (left + tooltipWidth > viewportWidth - 16) {
            left = viewportWidth - tooltipWidth - 16;
          }
          if (left < 16) left = 16;
          
          // Ensure tooltip doesn't go below viewport
          if (top + 400 > viewportHeight - 16) {
            top = rect.top - 400 - 8; // Position above button
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

  // Auto-scroll to bottom only when streaming (not for cached content)
  useEffect(() => {
    if (scrollAreaRef.current && isStreaming) {
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

    // Check database for existing summary
    if (db && currentUserId) {
      try {
        const { data, error } = await db
          .from("ai_summaries")
          .select("summary")
          .eq("data_hash", hash)
          .eq("user_id", currentUserId)
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
          console.log("✅ Found cached summary, using existing data");
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
      console.log("❌ No database connection or user ID");
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
      await db.from("ai_summaries").upsert({
        user_id: currentUserId,
        data_hash: dataHash,
        summary: summaryText,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,data_hash'
      });
      console.log("✅ Summary stored successfully");
    } catch (error: any) {
      console.error("❌ Error storing summary in database:", error);
    }
  };



  const renderSkeletonLines = () => {
    return Array.from({ length: 8 }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 mb-2 ${i === 7 ? "w-3/4" : i % 2 === 0 ? "w-full" : "w-5/6"}`}
      />
    ));
  };

  if (!open) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const tooltipWidth = isMobile ? window.innerWidth - 32 : 480;
  const tooltipHeight = isMobile ? window.innerHeight * 0.75 : 400;
  const tooltipMinHeight = isMobile ? 300 : 250;

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
                <div className="space-y-3">
                  {renderSkeletonLines()}
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

