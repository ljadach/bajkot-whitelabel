import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { proseComponents } from '@lib/markdownComponents';
import { ExercisePanel } from './ExercisePanel';
import { useFeatureFlag } from '@lib/telemetry';
import { LessonVideoEmbed, VideoEmbedPlaceholder } from './LessonVideoEmbed';

interface Chapter {
  title: string;
  content: string;
  imagePlaceholder?: {
    model: string;
    prompt: string;
    mockUrl: string;
  };
}

interface HandbookContentProps {
  chapter: Chapter | null;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  courseDocumentId?: Id<'courseDocuments'>;
  chapterNumber?: number;
  /** Pass inline to video embeds for autoplay/loop/muted in scroll reader */
  inlineVideos?: boolean;
}

// Parse :::video{src="file" start=N end=N title="desc"}::: markers
interface VideoMarker {
  src: string;
  start: number;
  end: number;
  title: string;
}

const VIDEO_MARKER_REGEX = /:::video\{([^}]+)\}:::/g;

function parseVideoMarkers(content: string): { segments: Array<{ type: 'text'; content: string } | { type: 'video'; marker: VideoMarker }> } {
  const segments: Array<{ type: 'text'; content: string } | { type: 'video'; marker: VideoMarker }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(VIDEO_MARKER_REGEX)) {
    if ((match.index ?? 0) > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index ?? 0) });
    }

    const attrs = match[1];
    const src = attrs.match(/src="([^"]+)"/)?.[1] || '';
    const start = parseFloat(attrs.match(/start=([0-9.]+)/)?.[1] || '0');
    const end = parseFloat(attrs.match(/end=([0-9.]+)/)?.[1] || '0');
    const title = attrs.match(/title="([^"]+)"/)?.[1] || 'Video demonstration';

    segments.push({ type: 'video', marker: { src, start, end, title } });
    lastIndex = (match.index ?? 0) + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return { segments };
}

function stripVideoMarkers(content: string): string {
  return content.replace(VIDEO_MARKER_REGEX, '');
}

const CODE_LANGS = 'text|xml|json|python|javascript|typescript|bash|html|css|yaml|markdown|sql|sh|jsx|tsx';
const ORPHANED_FENCE_RE = new RegExp(`(^|\\n\\n)(${CODE_LANGS})\\n([\\s\\S]*?)(?=\\n\\n|$)`, 'g');

/**
 * Fix orphaned language identifiers that should be code fences.
 * LLMs sometimes omit triple backticks when generating code blocks inside JSON.
 * Detects: \n\n{lang}\n{content}\n\n → wraps in ```{lang}...``` fences.
 */
function normalizeCodeBlocks(content: string): string {
  return content.replace(ORPHANED_FENCE_RE, (_, prefix, lang, code) => `${prefix}\`\`\`${lang}\n${code}\n\`\`\``);
}

export function HandbookContent({ chapter, status, error, courseDocumentId, chapterNumber, inlineVideos }: HandbookContentProps) {
  const videoEnhanced = useFeatureFlag('video-enhanced-lessons');
  const videoStreamMap = useQuery(api.videoLookup.getVideoStreamMap, videoEnhanced ? {} : 'skip');
  const subdomain = import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN;

  const streamLookup = useMemo(() => {
    if (!videoStreamMap) return new Map<string, string>();
    return new Map(videoStreamMap.map((v) => [v.fileName, v.cloudflareStreamUid]));
  }, [videoStreamMap]);

  if (status === 'pending') {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50">
        <p className="text-sm text-neutral-500">Waiting to generate content...</p>
      </div>
    );
  }

  if (status === 'generating') {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 spinner" />
          <p className="text-sm text-neutral-500">Generating personalized content...</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-red-200 bg-red-50">
        <p className="mb-2 text-sm font-medium text-red-700">Generation failed</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50">
        <p className="text-sm text-neutral-500">No content available</p>
      </div>
    );
  }

  // If video-enhanced and content has video markers, render interleaved content
  if (videoEnhanced && VIDEO_MARKER_REGEX.test(chapter.content)) {
    VIDEO_MARKER_REGEX.lastIndex = 0;
    const parsed = parseVideoMarkers(chapter.content);

    return (
      <div data-testid="handbook-content" className="prose-enterprise">
        {parsed.segments.map((seg, i) => {
          if (seg.type === 'text') {
            return (
              <ReactMarkdown key={i} components={proseComponents}>
                {normalizeCodeBlocks(seg.content)}
              </ReactMarkdown>
            );
          }
          const uid = streamLookup.get(seg.marker.src);
          if (uid && subdomain) {
            return <LessonVideoEmbed key={i} cloudflareStreamUid={uid} cloudflareCustomerSubdomain={subdomain} startSeconds={seg.marker.start} endSeconds={seg.marker.end} title={seg.marker.title} inline={inlineVideos} />;
          }
          return <VideoEmbedPlaceholder key={i} title={seg.marker.title} />;
        })}

        {courseDocumentId && chapterNumber && (
          <div className={inlineVideos ? 'scroll-reader-exercise' : undefined}>
            <ExercisePanel courseDocumentId={courseDocumentId} chapterNumber={chapterNumber} />
          </div>
        )}
      </div>
    );
  }

  // Default: plain text rendering (strip any video markers if feature flag is off)
  const cleanContent = normalizeCodeBlocks(videoEnhanced ? chapter.content : stripVideoMarkers(chapter.content));

  return (
    <div data-testid="handbook-content" className="prose-enterprise">
      <ReactMarkdown components={proseComponents}>{cleanContent}</ReactMarkdown>

      {courseDocumentId && chapterNumber && (
        <div className={inlineVideos ? 'scroll-reader-exercise' : undefined}>
          <ExercisePanel courseDocumentId={courseDocumentId} chapterNumber={chapterNumber} />
        </div>
      )}
    </div>
  );
}
