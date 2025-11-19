"use client";

import React, { useState, useEffect, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SupabaseClient } from "@supabase/supabase-js";

// Gemini Sparkle Icon Component
const GeminiSparkle = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 65" className={className}>
    <mask id="maskme" style={{ maskType: 'alpha' }} maskUnits="userSpaceOnUse" x="0" y="0" width="65" height="65">
      <path d="M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z" fill="#000"/>
      <path d="M32.447 0c.68 0 1.273.465 1.439 1.125a38.904 38.904 0 001.999 5.905c2.152 5 5.105 9.376 8.854 13.125 3.751 3.75 8.126 6.703 13.125 8.855a38.98 38.98 0 005.906 1.999c.66.166 1.124.758 1.124 1.438 0 .68-.464 1.273-1.125 1.439a38.902 38.902 0 00-5.905 1.999c-5 2.152-9.375 5.105-13.125 8.854-3.749 3.751-6.702 8.126-8.854 13.125a38.973 38.973 0 00-2 5.906 1.485 1.485 0 01-1.438 1.124c-.68 0-1.272-.464-1.438-1.125a38.913 38.913 0 00-2-5.905c-2.151-5-5.103-9.375-8.854-13.125-3.75-3.749-8.125-6.702-13.125-8.854a38.973 38.973 0 00-5.905-2A1.485 1.485 0 010 32.448c0-.68.465-1.272 1.125-1.438a38.903 38.903 0 005.905-2c5-2.151 9.376-5.104 13.125-8.854 3.75-3.749 6.703-8.125 8.855-13.125a38.972 38.972 0 001.999-5.905A1.485 1.485 0 0132.447 0z" fill="url(#prefix__paint0_linear_2001_67)"/>
    </mask>
    <g mask="url(#maskme)">
      <g filter="url(#prefix__filter0_f_2001_67)">
        <path d="M-5.859 50.734c7.498 2.663 16.116-2.33 19.249-11.152 3.133-8.821-.406-18.131-7.904-20.794-7.498-2.663-16.116 2.33-19.25 11.151-3.132 8.822.407 18.132 7.905 20.795z" fill="#FFE432"/>
      </g>
      <g filter="url(#prefix__filter1_f_2001_67)">
        <path d="M27.433 21.649c10.3 0 18.651-8.535 18.651-19.062 0-10.528-8.35-19.062-18.651-19.062S8.78-7.94 8.78 2.587c0 10.527 8.35 19.062 18.652 19.062z" fill="#FC413D"/>
      </g>
      <g filter="url(#prefix__filter2_f_2001_67)">
        <path d="M20.184 82.608c10.753-.525 18.918-12.244 18.237-26.174-.68-13.93-9.95-24.797-20.703-24.271C6.965 32.689-1.2 44.407-.519 58.337c.681 13.93 9.95 24.797 20.703 24.271z" fill="#00B95C"/>
      </g>
      <g filter="url(#prefix__filter3_f_2001_67)">
        <path d="M20.184 82.608c10.753-.525 18.918-12.244 18.237-26.174-.68-13.93-9.95-24.797-20.703-24.271C6.965 32.689-1.2 44.407-.519 58.337c.681 13.93 9.95 24.797 20.703 24.271z" fill="#00B95C"/>
      </g>
      <g filter="url(#prefix__filter4_f_2001_67)">
        <path d="M30.954 74.181c9.014-5.485 11.427-17.976 5.389-27.9-6.038-9.925-18.241-13.524-27.256-8.04-9.015 5.486-11.428 17.977-5.39 27.902 6.04 9.924 18.242 13.523 27.257 8.038z" fill="#00B95C"/>
      </g>
      <g filter="url(#prefix__filter5_f_2001_67)">
        <path d="M67.391 42.993c10.132 0 18.346-7.91 18.346-17.666 0-9.757-8.214-17.667-18.346-17.667s-18.346 7.91-18.346 17.667c0 9.757 8.214 17.666 18.346 17.666z" fill="#3186FF"/>
      </g>
      <g filter="url(#prefix__filter6_f_2001_67)">
        <path d="M-13.065 40.944c9.33 7.094 22.959 4.869 30.442-4.972 7.483-9.84 5.987-23.569-3.343-30.663C4.704-1.786-8.924.439-16.408 10.28c-7.483 9.84-5.986 23.57 3.343 30.664z" fill="#FBBC04"/>
      </g>
      <g filter="url(#prefix__filter7_f_2001_67)">
        <path d="M34.74 51.43c11.135 7.656 25.896 5.524 32.968-4.764 7.073-10.287 3.779-24.832-7.357-32.488C49.215 6.52 34.455 8.654 27.382 18.94c-7.072 10.288-3.779 24.833 7.357 32.49z" fill="#3186FF"/>
      </g>
      <g filter="url(#prefix__filter8_f_2001_67)">
        <path d="M54.984-2.336c2.833 3.852-.808 11.34-8.131 16.727-7.324 5.387-15.557 6.631-18.39 2.78-2.833-3.853.807-11.342 8.13-16.728 7.324-5.387 15.558-6.631 18.39-2.78z" fill="#749BFF"/>
      </g>
      <g filter="url(#prefix__filter9_f_2001_67)">
        <path d="M31.727 16.104C43.053 5.598 46.94-8.626 40.41-15.666c-6.53-7.04-21.006-4.232-32.332 6.274s-15.214 24.73-8.683 31.77c6.53 7.04 21.006 4.232 32.332-6.274z" fill="#FC413D"/>
      </g>
      <g filter="url(#prefix__filter10_f_2001_67)">
        <path d="M8.51 53.838c6.732 4.818 14.46 5.55 17.262 1.636 2.802-3.915-.384-10.994-7.116-15.812-6.731-4.818-14.46-5.55-17.261-1.636-2.802 3.915.383 10.994 7.115 15.812z" fill="#FFEE48"/>
      </g>
    </g>
    <defs>
      <filter id="prefix__filter0_f_2001_67" x="-19.824" y="13.152" width="39.274" height="43.217" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="2.46" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter1_f_2001_67" x="-15.001" y="-40.257" width="84.868" height="85.688" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="11.891" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter2_f_2001_67" x="-20.776" y="11.927" width="79.454" height="90.916" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="10.109" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter3_f_2001_67" x="-20.776" y="11.927" width="79.454" height="90.916" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="10.109" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter4_f_2001_67" x="-19.845" y="15.459" width="79.731" height="81.505" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="10.109" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter5_f_2001_67" x="29.832" y="-11.552" width="75.117" height="73.758" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="9.606" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter6_f_2001_67" x="-38.583" y="-16.253" width="78.135" height="78.758" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="8.706" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter7_f_2001_67" x="8.107" y="-5.966" width="78.877" height="77.539" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="7.775" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter8_f_2001_67" x="13.587" y="-18.488" width="56.272" height="51.81" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="6.957" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter9_f_2001_67" x="-15.526" y="-31.297" width="70.856" height="69.306" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="5.876" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <filter id="prefix__filter10_f_2001_67" x="-14.168" y="20.964" width="55.501" height="51.571" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feGaussianBlur stdDeviation="7.273" result="effect1_foregroundBlur_2001_67"/>
      </filter>
      <linearGradient id="prefix__paint0_linear_2001_67" x1="18.447" y1="43.42" x2="52.153" y2="15.004" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4893FC"/>
        <stop offset=".27" stopColor="#4893FC"/>
        <stop offset=".777" stopColor="#969DFF"/>
        <stop offset="1" stopColor="#BD99FE"/>
      </linearGradient>
    </defs>
  </svg>
);

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

    // Group consecutive items at the same level and type
    const groups: ListItem[][] = [];
    let currentGroup: ListItem[] = [];
    let currentLevel = items[0]?.level ?? 0;
    let currentType = items[0]?.type ?? 'bullet';

    items.forEach((item, idx) => {
      if (item.level === currentLevel && item.type === currentType) {
        currentGroup.push(item);
      } else {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [item];
        currentLevel = item.level;
        currentType = item.type;
      }
    });
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return (
      <div key={`nested-list-${key}`} className="my-1">
        {groups.map((group, groupIdx) => {
          const level = group[0].level;
          const type = group[0].type;
          const ListTag = type === 'numbered' ? 'ol' : 'ul';
          const listClass = type === 'numbered' 
            ? `list-decimal space-y-0.5 ${level === 0 ? 'ml-5' : 'ml-6'}`
            : `list-disc space-y-0.5 ${level === 0 ? 'ml-5' : 'ml-6'}`;

          return (
            <ListTag key={`group-${groupIdx}`} className={listClass}>
              {group.map((item, itemIdx) => {
                const liClass = `text-sm leading-snug ${
                  level === 0 ? 'mb-0.5' : 'mb-0'
                }`;

                return (
                  <li key={`item-${groupIdx}-${itemIdx}`} className={liClass}>
                    {renderInlineMarkdown(item.text)}
                  </li>
                );
              })}
            </ListTag>
          );
        })}
      </div>
    );
  };

  const renderInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Enhanced regex to handle bold, italic, currency symbols, and special characters
    // Match bold (**text**) and italic (*text* or _text_)
    const formattingRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;
    const matches: Array<{ start: number; end: number; text: string; type: 'bold' | 'italic' }> = [];
    
    let match;
    while ((match = formattingRegex.exec(text)) !== null) {
      if (match[1]) {
        // Bold: **text**
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[2],
          type: 'bold'
        });
      } else if (match[3]) {
        // Italic: *text*
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[4],
          type: 'italic'
        });
      } else if (match[5]) {
        // Italic: _text_
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[6],
          type: 'italic'
        });
      }
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
      
      // Add the formatted text
      if (m.type === 'bold') {
        parts.push(
          <strong 
            key={`bold-${idx}`} 
            className="font-bold text-primary dark:text-primary-foreground bg-primary/10 dark:bg-primary/20 px-1 rounded"
          >
            {m.text}
          </strong>
        );
      } else if (m.type === 'italic') {
        parts.push(
          <em 
            key={`italic-${idx}`} 
            className="italic text-foreground/80"
          >
            {m.text}
          </em>
        );
      }
      
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
        1: "text-lg font-extrabold text-foreground mb-2 mt-4 first:mt-0 pb-1.5 border-b-2 border-primary/20",
        2: "text-base font-bold text-foreground mb-1.5 mt-3 first:mt-0 pb-1 border-b border-primary/10", 
        3: "text-sm font-semibold text-foreground mb-1 mt-2 first:mt-0",
        4: "text-xs font-semibold text-muted-foreground mb-1 mt-2 first:mt-0 uppercase tracking-wide"
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
    
    // Bullet points with strict detection - must start with bullet marker
    const bulletMatch = trimmedLine.match(/^([-*•])\s+(.+)/);
    if (bulletMatch) {
      const itemText = bulletMatch[2];
      currentListItems.push({
        text: itemText,
        level: indentLevel,
        type: 'bullet'
      });
      inList = true;
      return;
    }

    // Numbered lists with strict detection - must be number followed by period and space
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const itemText = numberedMatch[2];
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
      <p key={lineIndex} className="text-sm leading-snug mb-1.5 text-foreground/90">
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
  const [modelName, setModelName] = useState<string>("");
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
      setModelName("");
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
          .select("summary, model_name")
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
          console.log("✅ Found cached summary for this data hash (shared across all users), using existing data");
          console.log("📊 Cache hit! No API call needed - serving from database");
          setSummary(data.summary);
          if (data.model_name) {
            setModelName(data.model_name);
          }
          setIsLoading(false);
          setIsStreaming(false);
          return;
        } else {
          console.log("❌ No cached summary found for this hash - will generate new one");
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
                // Store summary in database with model name
                const modelName = data.model || '';
                await storeSummary(fullSummary, hash, modelName);
                setIsStreaming(false);
                if (modelName) {
                  setModelName(modelName);
                }
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
            const modelName = data.model || '';
            await storeSummary(fullSummary, hash, modelName);
            setIsStreaming(false);
            if (modelName) {
              setModelName(modelName);
            }
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

  const storeSummary = async (summaryText: string, dataHash: string, modelName: string = '') => {
    if (!summaryText || !dataHash || !db || !currentUserId) {
      console.log("❌ Cannot store summary - missing required data");
      return;
    }

    console.log("💾 Storing summary in database with hash:", dataHash);
    if (modelName) {
      console.log("🤖 Model used:", modelName);
    }

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
        model_name: modelName || null,
        updated_at: new Date().toISOString(),
      });
      console.log("✅ Summary stored successfully - now available to ALL users with this data hash");
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
            <h3 className="font-semibold text-sm">Summary</h3>
            {summary && <GeminiSparkle className="h-4 w-4" />}
            {modelName && (
              <span className="text-xs text-muted-foreground">
                ({modelName})
              </span>
            )}
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

