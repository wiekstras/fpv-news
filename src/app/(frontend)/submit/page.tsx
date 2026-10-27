import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

// Logged-in users go straight to the build editor, everyone else to registration.
export default async function SubmitPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  redirect(user ? '/admin/collections/builds/create' : '/register')
}
