import type { VercelRequest, VercelResponse } from '@vercel/node'

type Body = {
  phone?: string
  message?: string
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_INSTANCE_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token || !clientToken) {
    return res.status(500).json({ error: 'Z-API environment variables are missing' })
  }

  const { phone, message } = (req.body ?? {}) as Body

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' })
  }

  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Invalid phone number' })
  }

  const response = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': clientToken,
    },
    body: JSON.stringify({
      phone: normalizedPhone,
      message,
    }),
  })

  const text = await response.text()

  if (!response.ok) {
    return res.status(response.status).json({ error: text || 'Failed to send message via Z-API' })
  }

  return res.status(200).json({ ok: true, response: text })
}
