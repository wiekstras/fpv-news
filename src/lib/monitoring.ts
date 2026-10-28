// Error reporting to Sentry, active only when SENTRY_DSN is set (initialised in instrumentation.ts).
export async function reportError(err: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureException(err, { extra: context })
}

// Wraps a job handler: failures are reported, then rethrown so Payload still marks the job as failed.
export function reported<A extends unknown[], R>(job: string, handler: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try {
      return await handler(...args)
    } catch (err) {
      await reportError(err, { job })
      throw err
    }
  }
}
