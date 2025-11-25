"use client";

import React, { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Save, RotateCcw, History, Sparkles, CircleAlert, Check, Clock } from 'lucide-react';
import { AI_PROMPTS_TABLE } from '@/lib/settleease/constants';
import type { AIPrompt } from '@/lib/settleease/types';

interface PromptEditorProps {
  db?: SupabaseClient;
  currentUserId: string;
}

export default function PromptEditor({ db, currentUserId }: PromptEditorProps) {
  const [activePrompt, setActivePrompt] = useState<AIPrompt | null>(null);
  const [editedPromptText, setEditedPromptText] = useState('');
  const [versionDescription, setVersionDescription] = useState('');
  const [promptHistory, setPromptHistory] = useState<AIPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load active prompt and history
  useEffect(() => {
    if (!db) return;
    loadPrompts();
  }, [db]);

  const loadPrompts = async () => {
    if (!db) return;
    
    setIsLoading(true);
    try {
      // Load active prompt
      const { data: activeData, error: activeError } = await db
        .from(AI_PROMPTS_TABLE)
        .select('*')
        .eq('name', 'trump-summarizer')
        .eq('is_active', true)
        .single();

      if (activeError) throw activeError;
      
      setActivePrompt(activeData);
      setEditedPromptText(activeData.prompt_text);

      // Load all versions for history
      const { data: historyData, error: historyError } = await db
        .from(AI_PROMPTS_TABLE)
        .select('*')
        .eq('name', 'trump-summarizer')
        .order('version', { ascending: false });

      if (historyError) throw historyError;
      setPromptHistory(historyData || []);
    } catch (error: any) {
      console.error('Error loading prompts:', error);
      toast({
        title: "Error",
        description: "Failed to load AI prompts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Track unsaved changes
  useEffect(() => {
    if (activePrompt) {
      setHasUnsavedChanges(editedPromptText !== activePrompt.prompt_text);
    }
  }, [editedPromptText, activePrompt]);

  const handleSave = async () => {
    if (!db || !activePrompt) return;

    if (!versionDescription.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a description for this version",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const newVersion = activePrompt.version + 1;

      // Update current prompt to new version
      const { error: updateError } = await db
        .from(AI_PROMPTS_TABLE)
        .update({
          prompt_text: editedPromptText,
          version: newVersion,
          description: versionDescription,
          updated_at: new Date().toISOString(),
        })
        .eq('name', 'trump-summarizer')
        .eq('is_active', true);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: `Prompt updated to version ${newVersion}`,
      });

      // Reload prompts
      await loadPrompts();
      setVersionDescription('');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Error",
        description: "Failed to save prompt",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (activePrompt) {
      setEditedPromptText(activePrompt.prompt_text);
      setVersionDescription('');
      setHasUnsavedChanges(false);
    }
  };

  const handleRestoreVersion = async (version: AIPrompt) => {
    if (!db || !activePrompt) return;

    const confirmed = window.confirm(
      `Restore version ${version.version}? This will create a new version based on the selected one.`
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const newVersion = activePrompt.version + 1;

      const { error } = await db
        .from(AI_PROMPTS_TABLE)
        .update({
          prompt_text: version.prompt_text,
          version: newVersion,
          description: `Restored from version ${version.version}`,
          updated_at: new Date().toISOString(),
        })
        .eq('name', 'trump-summarizer')
        .eq('is_active', true);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Restored to version ${version.version} as v${newVersion}`,
      });

      await loadPrompts();
    } catch (error: any) {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8">
          <span className="text-muted-foreground">Loading prompt...</span>
        </div>
      </Card>
    );
  }

  if (!activePrompt) {
    return (
      <Alert variant="destructive">
        <CircleAlert className="h-4 w-4" />
        <AlertDescription>
          No active prompt found. Please contact an administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Editor Card */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Prompt Editor
                <Badge variant="outline">v{activePrompt.version}</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Edit the AI prompt used for generating settlement summaries
              </CardDescription>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                <CircleAlert className="h-3 w-3" />
                Unsaved Changes
              </Badge>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
          {/* Prompt Text Editor */}
          <div className="space-y-2">
            <Label htmlFor="prompt-text" className="text-sm font-medium">
              Prompt Text
            </Label>
            <Textarea
              id="prompt-text"
              value={editedPromptText}
              onChange={(e) => setEditedPromptText(e.target.value)}
              placeholder="Enter AI prompt..."
              className="min-h-[300px] sm:min-h-[400px] font-mono text-xs sm:text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="px-1 py-0.5 bg-muted rounded">{'{{JSON_DATA}}'}</code> as a placeholder for the expense data
            </p>
          </div>

          {/* Version Description */}
          <div className="space-y-2">
            <Label htmlFor="version-desc" className="text-sm font-medium">
              Version Description <span className="text-destructive">*</span>
            </Label>
            <Input
              id="version-desc"
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              placeholder="Describe what changed in this version..."
              className="text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges || !versionDescription.trim()}
              className="flex items-center gap-2 flex-1 sm:flex-initial"
            >
              {isSaving ? "Saving..." : "Save New Version"}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={!hasUnsavedChanges}
              className="flex-1 sm:flex-initial"
            >
              Reset
            </Button>
          </div>

          {hasUnsavedChanges && (
            <Alert>
              <CircleAlert className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm">
                Saving will create version {activePrompt.version + 1} and automatically invalidate all cached summaries.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Version History Card */}
      <Card>
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <History className="h-5 w-5 text-primary" />
            Version History
          </CardTitle>
          <CardDescription>
            View and restore previous prompt versions
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="px-4 sm:px-6 py-4 sm:py-6">
          <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
            <div className="space-y-3">
              {promptHistory.map((version) => (
                <Card key={version.id} className={version.is_active ? 'border-primary' : ''}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={version.is_active ? 'default' : 'outline'} className="text-xs">
                            v{version.version}
                          </Badge>
                          {version.is_active && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Active
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(version.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1 break-words">
                          {version.description || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                          {version.prompt_text.substring(0, 150)}...
                        </p>
                      </div>
                      {!version.is_active && (
                        <Button
                          onClick={() => handleRestoreVersion(version)}
                          variant="outline"
                          size="sm"
                          disabled={isSaving}
                          className="text-xs w-full sm:w-auto"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
