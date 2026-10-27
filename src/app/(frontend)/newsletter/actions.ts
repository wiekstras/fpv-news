'use server'

import config from '@payload-config'
import { randomBytes } from 'crypto'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { CONSENT_TEXT } from '@/lib/newsletter/consent'
import { SITE } from '@/lib/newsletter/digest'
import { unsubscribeByToken } from '@/lib/newsletter/subscribers'
import { clientIp, rateLimit } from '@/lib/rateLimit'

export type SubscribeState = { ok: boolean; message: string }

const CHECK_INBOX = 'Almost done: check your inbox and click the link to confirm your subscription.'

export async function subscribe(_prev: SubscribeState, form: FormData): Promise<SubscribeState> {
  if (form.get('website')) return { ok: true, message: CHECK_INBOX } // honeypot
  const ip = clientIp(await headers())
  if (!rateLimit(`subscribe:${ip}`, 5, 60 * 60 * 1000)) return { ok: false, message: 'Too many attempts. Try again later.' }

  const email = String(form.get('email') || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: 'Please enter a valid email address.' }
  if (form.get('consent') !== 'yes') return { ok: false, message: 'Please tick the box to agree to receive the newsletter.' }

  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1 })
  const existing = docs[0]
  // Same answer in every case, so the form can't be used to find out who is subscribed.
  if (existing?.status === 'confirmed') return { ok: true, message: CHECK_INBOX }

  const token = randomBytes(24).toString('base64url')
  const data = {
    email,
    status: 'pending' as const,
    token,
    consentAt: new Date().toISOString(),
    consentText: CONSENT_TEXT,
    confirmedAt: null,
    unsubscribedAt: null,
  }
  if (existing) await payload.update({ collection: 'subscribers', id: existing.id, data })
  else await payload.create({ collection: 'subscribers', data })

  const settings = await payload.findGlobal({ slug: 'settings' })
  const link = `${SITE}/newsletter/confirm?token=${token}`
  await payload.sendEmail({
    to: email,
    subject: `Confirm your subscription to ${settings.siteName}`,
    text: `Please confirm that you want the weekly ${settings.siteName} digest:\n\n${link}\n\nIf you didn't sign up, ignore this email and nothing happens.`,
    html: `<p>Please confirm that you want the weekly ${settings.siteName} digest:</p><p><a href="${link}">Confirm my subscription</a></p><p>If you didn't sign up, ignore this email and nothing happens.</p>`,
  })
  return { ok: true, message: CHECK_INBOX }
}

export async function unsubscribe(form: FormData) {
  const token = String(form.get('token') || '')
  const payload = await getPayload({ config })
  await unsubscribeByToken(payload, token)
}
