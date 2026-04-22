import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

type Appointment = {
  id: number
  customer: string
  phone: string
  vehicle: string
  plate: string
  service: string
  advisor: string
  date: string
  time: string
  status: string
  reconfirmation_sent_at: string | null
  reminder_sent_at: string | null
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('55') ? digits : `55${digits}`
}

function buildReconfirmationMessage(appointment: Appointment) {
  return `Olá, ${appointment.customer}. Passando para reconfirmar seu agendamento na AutoHolic para ${formatDate(appointment.date)} às ${appointment.time}. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Se estiver tudo certo, me confirma por aqui.`
}

function buildReminderMessage(appointment: Appointment) {
  return `Olá, ${appointment.customer}. Passando para lembrar do seu atendimento na AutoHolic em ${formatDate(appointment.date)} às ${appointment.time}. Endereço: Rua Ubatuba, nº 335, bairro Nova Granada, Belo Horizonte - MG. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Te esperamos por aqui.`
}

function addDaysLocal(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function toDateOnlyLocal(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function sendZApiMessage(phone: string, message: string) {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_INSTANCE_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN

  if (!instanceId || !token || !clientToken) {
    throw new Error('Z-API environment variables are missing')
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`
  const payload = { phone, message }

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

  let lastError = 'Unknown error'

  for (const attempt of attempts) {
    const response = await fetch(url, {
      method: 'POST',
      headers: attempt.headers,
      body: JSON.stringify(payload),
    })

    const text = await response.text()

    if (response.ok) {
      return { ok: true, response: text, headerUsed: attempt.label }
    }

    lastError = `[${attempt.label}] ${text || 'Failed to send message via Z-API'}`
  }

  throw new Error(lastError)
}

async function processBatch(
  supabase: any,
  appointments: Appointment[],
  sentField: 'reconfirmation_sent_at' | 'reminder_sent_at',
  buildMessage: (appointment: Appointment) => string,
) {
  const results = []

  for (const appointment of appointments) {
    if (appointment[sentField]) {
      results.push({ id: appointment.id, status: 'skipped', reason: 'already_sent' })
      continue
    }

    const phone = normalizePhone(appointment.phone)

    if (!phone) {
      results.push({ id: appointment.id, status: 'skipped', reason: 'invalid_phone' })
      continue
    }

    try {
      await sendZApiMessage(phone, buildMessage(appointment))

      const { error } = await supabase
        .from('appointments')
        .update({ [sentField]: new Date().toISOString() })
        .eq('id', appointment.id)

      if (error) {
        throw error
      }

      results.push({ id: appointment.id, status: 'sent', phone })
    } catch (error) {
      results.push({
        id: appointment.id,
        status: 'error',
        phone,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase environment variables are missing' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date()
  const reconfirmationDate = toDateOnlyLocal(addDaysLocal(now, 5))
  const reminderDate = toDateOnlyLocal(addDaysLocal(now, 3))

  const { data, error } = await supabase
    .from('appointments')
    .select('id, customer, phone, vehicle, plate, service, advisor, date, time, status, reconfirmation_sent_at, reminder_sent_at')
    .in('date', [reconfirmationDate, reminderDate])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const appointments = (data ?? []) as Appointment[]
  const reconfirmations = appointments.filter((item) => item.date === reconfirmationDate)
  const reminders = appointments.filter((item) => item.date === reminderDate)

  const reconfirmationResults = await processBatch(
    supabase,
    reconfirmations,
    'reconfirmation_sent_at',
    buildReconfirmationMessage,
  )

  const reminderResults = await processBatch(
    supabase,
    reminders,
    'reminder_sent_at',
    buildReminderMessage,
  )

  return res.status(200).json({
    ok: true,
    reconfirmationDate,
    reminderDate,
    reconfirmations: reconfirmationResults,
    reminders: reminderResults,
  })
}
