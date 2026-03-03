import { internal } from '../_generated/api';

type LogLevel = 'log' | 'warn' | 'error';

// Simplified context type that works with both action and mutation contexts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoggableCtx = {
  runMutation: (fn: any, args: any) => Promise<any>;
};

export interface Logger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  log: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Backend logger that stores logs to database and also prints to console.
 * Use this in Convex actions/mutations where you have access to ctx.
 *
 * Usage:
 *   const log = createLogger(ctx, 'streamQuestion');
 *   log.info('Request received');
 *   log.warn('Something suspicious', { userId });
 *   log.error('Failed to process', { error: e.message });
 */
export function createLogger(ctx: LoggableCtx, source: string): Logger {
  const logFn = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    // Still print to console for Convex dashboard
    const prefix = `[${source}]`;
    const fullMessage = `${prefix} ${message}`;

    if (level === 'error') {
      console.error(fullMessage, data ?? '');
    } else if (level === 'warn') {
      console.warn(fullMessage, data ?? '');
    } else {
      console.log(fullMessage, data ?? '');
    }

    // Fire-and-forget store to DB - don't await to avoid blocking
    void ctx
      .runMutation(internal.backendLogs.storeBackendLog, {
        level,
        source,
        message,
        data: data ? JSON.stringify(data) : undefined,
      })
      .catch((e: unknown) => {
        // Don't let logging failures break the main flow
        console.warn('[logger] Failed to store log:', e);
      });
  };

  return {
    info: (message: string, data?: Record<string, unknown>) => logFn('log', message, data),
    warn: (message: string, data?: Record<string, unknown>) => logFn('warn', message, data),
    error: (message: string, data?: Record<string, unknown>) => logFn('error', message, data),
    // Alias for backward compat
    log: (message: string, data?: Record<string, unknown>) => logFn('log', message, data),
  };
}

/**
 * Simplified logging for places where we don't have a Convex context.
 * Only prints to console - no DB storage.
 */
export function consoleLogger(source: string): Logger {
  return {
    info: (message: string, data?: Record<string, unknown>) => {
      console.log(`[${source}] ${message}`, data ?? '');
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      console.warn(`[${source}] ${message}`, data ?? '');
    },
    error: (message: string, data?: Record<string, unknown>) => {
      console.error(`[${source}] ${message}`, data ?? '');
    },
    log: (message: string, data?: Record<string, unknown>) => {
      console.log(`[${source}] ${message}`, data ?? '');
    },
  };
}
