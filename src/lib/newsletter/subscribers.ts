import type { Payload } from 'payload'

export async function unsubscribeByToken(payload: Payload, token: string) {
  if (!token) return false
  const { docs } = await payload.find({ collection: 'subscribers', where: { token: { equals: token } }, limit: 1 })
  if (!docs[0]) return false
  if (docs[0].status !== 'unsubscribed') {
    await payload.update({
      collection: 'subscribers',
      id: docs[0].id,
      data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() },
    })
  }
  return true
}
