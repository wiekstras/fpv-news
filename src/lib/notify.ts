// Instant notifications. Each channel is active only when its environment variables are set:
//   Telegram (personal alerts):   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//   ntfy push (phone app):        NTFY_URL (e.g. https://ntfy.sh/my-secret-topic) [+ NTFY_TOKEN]
//   Public channels (new firmware etc.): DISCORD_WEBHOOK_URL and/or TELEGRAM_CHANNEL_ID (same bot)
// Failures are logged and never break the caller.

type Message = { title: string; message: string; url?: string }

async function post(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

async function telegram(chatId: string, { title, message, url }: Message) {
  const text = [`*${escapeMarkdown(title)}*`, escapeMarkdown(message), url ? escapeMarkdown(url) : ''].filter(Boolean).join('\n')
  await post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2', disable_web_page_preview: false }),
  })
}

// Telegram MarkdownV2 needs these characters escaped.
export const escapeMarkdown = (s: string) => s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')

// ntfy reads the title and click URL from headers, which must be ASCII.
const asciiHeader = (s: string) => s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '')

async function ntfy({ title, message, url }: Message) {
  await post(process.env.NTFY_URL!, {
    method: 'POST',
    headers: {
      Title: asciiHeader(title),
      ...(url ? { Click: url } : {}),
      ...(process.env.NTFY_TOKEN ? { Authorization: `Bearer ${process.env.NTFY_TOKEN}` } : {}),
    },
    body: message,
  })
}

async function settle(tasks: Promise<unknown>[]) {
  for (const r of await Promise.allSettled(tasks)) {
    if (r.status === 'rejected') console.warn('Notification failed:', r.reason instanceof Error ? r.reason.message : r.reason)
  }
}

// Personal push: deal alerts, broken sources.
export async function sendPush(msg: Message) {
  const tasks: Promise<unknown>[] = []
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) tasks.push(telegram(process.env.TELEGRAM_CHAT_ID, msg))
  if (process.env.NTFY_URL) tasks.push(ntfy(msg))
  await settle(tasks)
}

export const pushConfigured = () =>
  Boolean((process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) || process.env.NTFY_URL)

// Public community channels: Discord webhook and/or a Telegram channel.
export async function postToChannels(msg: Message) {
  const tasks: Promise<unknown>[] = []
  if (process.env.DISCORD_WEBHOOK_URL) {
    tasks.push(
      post(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: 'FPV News',
          embeds: [{ title: msg.title.slice(0, 256), description: msg.message.slice(0, 2000), url: msg.url, color: 0xb6ff3b }],
        }),
      }),
    )
  }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID) tasks.push(telegram(process.env.TELEGRAM_CHANNEL_ID, msg))
  await settle(tasks)
}
