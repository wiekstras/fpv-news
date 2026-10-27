'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { clientIp, rateLimit } from '@/lib/rateLimit'

export type RegisterState = { ok: boolean; message: string }

export async function register(_prev: RegisterState, form: FormData): Promise<RegisterState> {
  // Honeypot: real users never see or fill this field.
  if (form.get('website')) return { ok: true, message: 'Check your inbox to verify your email.' }

  const ip = clientIp(await headers())
  if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return { ok: false, message: 'Too many attempts. Try again in an hour.' }
  }

  const name = String(form.get('name') || '').trim()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const password = String(form.get('password') || '')
  if (!name || !email) return { ok: false, message: 'Name and email are required.' }
  if (password.length < 10) return { ok: false, message: 'Use a password of at least 10 characters.' }

  const payload = await getPayload({ config })
  const existing = await payload.count({ collection: 'users', where: { email: { equals: email } } })
  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  if (existing.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: { name, email, password, role: 'contributor' },
      overrideAccess: true,
    })
  }
  return { ok: true, message: 'Check your inbox to verify your email, then log in to submit your build.' }
}
