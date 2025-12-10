/**
 * Centralized logging utility with environment-based log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL]
}

export const logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      console.debug('[DEBUG]', ...args)
    }
  },

  info: (...args: any[]) => {
    if (shouldLog('info')) {
      console.log('[INFO]', ...args)
    }
  },

  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      console.warn('[WARN]', ...args)
    }
  },

  error: (...args: any[]) => {
    if (shouldLog('error')) {
      console.error('[ERROR]', ...args)
    }
  },
}

export default logger
