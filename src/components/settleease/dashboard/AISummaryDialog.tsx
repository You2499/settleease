"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, X, Copy, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
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
    if (!db || !hash || !currentUserId) {
      // If no db, just fetch new summary
      if (jsonData) {
        fetchSummary();
      }
      return;
    }

    try {
      const { data, error } = await db
        .from("ai_summaries")
        .select("summary")
        .eq("data_hash", hash)
        .eq("user_id", currentUserId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" which is fine
        console.error("Error checking summary:", error);
        // Still try to fetch new summary
        if (jsonData) {
          fetchSummary();
        }
        return;
      }

      if (data && data.summary) {
        setSummary(data.summary);
        setIsLoading(false);
        setIsStreaming(false);
        return;
      }

      // No existing summary, fetch new one
      if (jsonData) {
        fetchSummary();
      }
    } catch (error: any) {
      console.error("Error checking summary:", error);
      // Still try to fetch new summary
      if (jsonData) {
        fetchSummary();
      }
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
    if (!db || !currentUserId || !summaryText || !dataHash) return;

    try {
      await db.from("ai_summaries").upsert({
        user_id: currentUserId,
        data_hash: dataHash,
        summary: summaryText,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,data_hash'
      });
    } catch (error: any) {
      console.error("Error storing summary:", error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Summary copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy summary",
        variant: "destructive",
      });
    }
  };

  const renderSkeletonLines = () => {
    return Array.from({ length: 8 }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 mb-2 ${
          i === 7 ? "w-3/4" : i % 2 === 0 ? "w-full" : "w-5/6"
        }`}
      />
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle>AI Summary</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {summary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogDescription>
            Summarized as Donald Trump would explain it
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div
            ref={scrollAreaRef}
            className="prose prose-sm dark:prose-invert max-w-none"
          >
            {isLoading && summary === "" ? (
              <div className="space-y-3">
                {renderSkeletonLines()}
              </div>
            ) : summary ? (
              <div className="text-base leading-relaxed">
                <p className="whitespace-pre-wrap">
                  {summary}
                  {isStreaming && (
                    <span className="inline-block w-2 h-5 bg-primary ml-1 animate-pulse">
                      |
                    </span>
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

