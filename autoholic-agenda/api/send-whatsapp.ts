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

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`
  const payload = {
    phone: normalizedPhone,
    message,
  }

  const attempts = [
    {
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
      },
      label: 'Client-Token',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'client-token': clientToken,
      },
      label: 'client-token',
    },
  ]

  let lastStatus = 500
  let lastText = 'Unknown error'

  for (const attempt of attempts) {
    const response = await fetch(url, {
      method: 'POST',
      headers: attempt.headers,
      body: JSON.stringify(payload),
    })

    const text = await response.text()

    if (response.ok) {
      return res.status(200).json({ ok: true, response: text, headerUsed: attempt.label })
    }

    lastStatus = response.status
    lastText = `[${attempt.label}] ${text || 'Failed to send message via Z-API'}`
  }

  return res.status(lastStatus).json({ error: lastText })
}
