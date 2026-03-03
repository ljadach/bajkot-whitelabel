import { renderMarkdown, renderMarkdownStreaming } from '@lib/utils';
import type { ChatMessageRecord } from '@components/chat/chatTypes';

interface ChatMessageProps {
  message: ChatMessageRecord & {
    maxChars?: number;
    likertLabels?: { left: string; right: string };
  };
  canEdit?: boolean;
  onEdit?: (messageId: string) => void;
  isStreaming?: boolean;
}

export function ChatMessage({ message, canEdit, onEdit, isStreaming }: ChatMessageProps) {
  const isQuestion = message.type === 'question';

  return (
    <div data-testid="chat-message" data-message-type={message.type} className={`py-5 ${isQuestion ? 'bg-white' : 'bg-neutral-50'}`}>
      <div className="mx-auto flex max-w-3xl gap-4 px-4">
        {/* Avatar */}
        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${isQuestion ? 'bg-neutral-900' : 'bg-neutral-200'}`}>
          {isQuestion ? (
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {isQuestion ? (
              <div className="text-[15px] text-neutral-800 leading-relaxed">
                <span
                  dangerouslySetInnerHTML={{
                    __html: isStreaming ? renderMarkdownStreaming(message.content) : renderMarkdown(message.content),
                  }}
                />
                {isStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-neutral-400" />}
              </div>
            ) : (
              <p className="text-[15px] text-neutral-800 whitespace-pre-wrap leading-relaxed">{message.content}</p>
            )}

            {/* Edit button for answers */}
            {message.type === 'answer' && canEdit && onEdit && (
              <button type="button" data-testid="edit-message" onClick={() => onEdit(message.id)} className="flex-shrink-0 p-1.5 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition" title="Edit answer">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            )}
          </div>

          {/* Timestamp */}
          {!isStreaming && (
            <div className="mt-1.5 text-xs text-neutral-400">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
