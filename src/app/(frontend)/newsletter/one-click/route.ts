import config from '@payload-config'
import { getPayload } from 'payload'
import { unsubscribeByToken } from '@/lib/newsletter/subscribers'

// RFC 8058 one-click unsubscribe: mail clients POST here from the List-Unsubscribe header.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const ok = await unsubscribeByToken(await getPayload({ config }), token)
  return new Response(ok ? 'Unsubscribed' : 'Unknown token', { status: ok ? 200 : 404 })
}
