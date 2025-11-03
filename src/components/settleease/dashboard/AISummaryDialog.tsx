"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AISummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jsonData: any;
  hash: string;
  db?: SupabaseClient;
  currentUserId: string;
}

export default function AISummaryDialog({
  open,
  onOpenChange,
  jsonData,
  hash,
  db,
  currentUserId,
}: AISummaryDialogProps) {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [summary]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col" hideCloseButton={true}>
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl">AI Summary</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Summarized as Donald Trump would explain it
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <div className="pr-4 pb-4">
              {isLoading && summary === "" ? (
                <div className="space-y-3">
                  {renderSkeletonLines()}
                </div>
              ) : summary ? (
                <div className="text-base leading-relaxed space-y-4">
                  <div className="whitespace-pre-wrap text-foreground">
                    {summary}
                    {isStreaming && (
                      <span className="inline-block w-2 h-5 bg-primary ml-1 animate-pulse">
                        |
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

