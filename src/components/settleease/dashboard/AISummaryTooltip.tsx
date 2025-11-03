"use client";

import React, { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Enhanced markdown renderer for bold text and line breaks
const renderMarkdown = (text: string) => {
  // Split by paragraphs first
  const paragraphs = text.split('\n\n');
  
  return paragraphs.map((paragraph, pIndex) => {
    // Handle bold text within each paragraph
    const parts = paragraph.split(/(\*\*[^*]+\*\*)/);
    const renderedParts = parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Handle line breaks within paragraphs
      return part.split('\n').map((line, lineIndex, lines) => (
        <React.Fragment key={`${index}-${lineIndex}`}>
          {line}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      ));
    });
    
    return (
      <p key={pIndex} className={pIndex > 0 ? "mt-3" : ""}>
        {renderedParts}
      </p>
    );
  });
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

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [summary]);

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
        className={`h-4 mb-2 ${i === 7 ? "w-3/4" : i % 2 === 0 ? "w-full" : "w-5/6"
          }`}
      />
    ));
  };

  if (!open) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const tooltipWidth = isMobile ? window.innerWidth - 32 : 480;
  const tooltipMaxHeight = isMobile ? window.innerHeight * 0.75 : 400;

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
          maxHeight: tooltipMaxHeight,
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
        <div className="flex-1 min-h-0 overflow-hidden">
          <div 
            className="h-full overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            style={{ 
              WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              scrollbarWidth: 'thin'
            }}
          >
            <div className="p-4">
              {isLoading && summary === "" ? (
                <div className="space-y-3">
                  {renderSkeletonLines()}
                </div>
              ) : summary ? (
                <div className="text-sm leading-relaxed space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Summarized as Donald Trump would explain it
                  </p>
                  <div className="whitespace-pre-wrap text-foreground break-words hyphens-auto">
                    {renderMarkdown(summary)}
                    {isStreaming && (
                      <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse">
                        |
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

