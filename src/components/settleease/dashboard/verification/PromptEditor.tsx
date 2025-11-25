"use client";

import React, { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Save, RotateCcw, History, Sparkles, AlertCircle } from 'lucide-react';
import { AI_PROMPTS_TABLE } from '@/lib/settleease/constants';
import type { AIPrompt } from '@/lib/settleease/types';

interface PromptEditorProps {
  db: SupabaseClient | undefined;
  currentUserId: string;
}

export default function PromptEditor({ db, currentUserId }: PromptEditorProps) {
  const [activePrompt, setActivePrompt] = useState<AIPrompt | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [promptHistory, setPromptHistory] = useState<AIPrompt[]>([]);

  useEffect(() => {
    if (db) {
      fetchActivePrompt();
      fetchPromptHistory();
    }
  }, [db]);

  useEffect(() => {
    if (activePrompt) {
      setHasChanges(editedPrompt !== activePrompt.prompt_text);
    }
  }, [editedPrompt, activePrompt]);

  const fetchActivePrompt = async () => {
    if (!db) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await db
        .from(AI_PROMPTS_TABLE)
        .select('*')
        .eq('name', 'trump-summarizer')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      setActivePrompt(data);
      setEditedPrompt(data.prompt_text);
      setDescription(data.description || '');
    } catch (error: any) {
      console.error('Error fetching prompt:', error);
      toast({
        title: "Error",
        description: "Could not load active prompt",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromptHistory = async () => {
    if (!db) return;
    
    try {
      const { data, error } = await db
        .from(AI_PROMPTS_TABLE)
        .select('*')
        .eq('name', 'trump-summarizer')
        .order('version', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPromptHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching prompt history:', error);
    }
  };

  const handleSave = async () => {
    if (!db || !currentUserId || !activePrompt) return;
    
    if (!editedPrompt.trim()) {
      toast({
        title: "Invalid Prompt",
        description: "Prompt cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Deactivate current prompt
      await db
        .from(AI_PROMPTS_TABLE)
        .update({ is_active: false })
        .eq('id', activePrompt.id);

      // Insert new version
      const { data: newPrompt, error } = await db
        .from(AI_PROMPTS_TABLE)
        .insert({
          name: 'trump-summarizer',
          prompt_text: editedPrompt,
          is_active: true,
          created_by_user_id: currentUserId,
          version: activePrompt.version + 1,
          description: description.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Prompt Saved",
        description: `New version ${newPrompt.version} is now active. Old summaries will be regenerated.`,
      });

      setActivePrompt(newPrompt);
      setEditedPrompt(newPrompt.prompt_text);
      setHasChanges(false);
      fetchPromptHistory();
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Error Saving Prompt",
        description: error.message || "Could not save prompt",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (activePrompt) {
      setEditedPrompt(activePrompt.prompt_text);
      setDescription(activePrompt.description || '');
      setHasChanges(false);
    }
  };

  const handleRestoreVersion = async (prompt: AIPrompt) => {
    if (!db || !currentUserId) return;
    
    setIsSaving(true);
    try {
      // Deactivate all prompts
      await db
        .from(AI_PROMPTS_TABLE)
        .update({ is_active: false })
        .eq('name', 'trump-summarizer');

      // Create new version based on selected one
      const { data: newPrompt, error } = await db
        .from(AI_PROMPTS_TABLE)
        .insert({
          name: 'trump-summarizer',
          prompt_text: prompt.prompt_text,
          is_active: true,
          created_by_user_id: currentUserId,
          version: (activePrompt?.version || 0) + 1,
          description: `Restored from v${prompt.version}`,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Version Restored",
        description: `Restored v${prompt.version} as new v${newPrompt.version}`,
      });

      setActivePrompt(newPrompt);
      setEditedPrompt(newPrompt.prompt_text);
      setHasChanges(false);
      fetchPromptHistory();
    } catch (error: any) {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: error.message || "Could not restore version",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Sparkles className="h-5 w-5 animate-spin text-primary mr-2" />
          <span>Loading prompt...</span>
        </div>
      </Card>
    );
  }

  if (!activePrompt) {
    return (
      <Card className="p-6">
        <div className="flex items-center text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>No active prompt found</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Editor Section */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">AI Prompt Editor</h3>
              <Badge variant="outline">v{activePrompt.version}</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasChanges || isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save New Version'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Version Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of changes..."
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt Template</Label>
            <Textarea
              id="prompt"
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="font-mono text-xs min-h-[400px] resize-y"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{{JSON_DATA}}'}</code> as placeholder for the data
            </p>
          </div>

          {hasChanges && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
              <div className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Unsaved Changes</p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                    Saving will create version {activePrompt.version + 1} and invalidate all cached summaries
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Version History */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Version History</h3>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {promptHistory.map((prompt) => (
              <div
                key={prompt.id}
                className={`p-3 rounded border ${
                  prompt.is_active
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={prompt.is_active ? "default" : "outline"}>
                        v{prompt.version}
                      </Badge>
                      {prompt.is_active && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                    {prompt.description && (
                      <p className="text-sm text-muted-foreground">{prompt.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(prompt.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!prompt.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreVersion(prompt)}
                      disabled={isSaving}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
