import { createClient } from '@supabase/supabase-js'

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  ZAPI_INSTANCE_ID,
  ZAPI_TOKEN,
  ZAPI_CLIENT_TOKEN,
  ZAPI_BASE_URL = 'https://api.z-api.io',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
  throw new Error('Missing Z-API credentials')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function addDays(date, days) {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function buildReconfirmationMessage(appointment) {
  return `Olá, ${appointment.customer}. Passando para reconfirmar seu agendamento na AutoHolic para ${formatDate(appointment.date)} às ${appointment.time}. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Se precisar ajustar algo, me responde por aqui.`
}

function buildReminderMessage(appointment) {
  return `Olá, ${appointment.customer}. Lembrete do seu agendamento na AutoHolic em ${formatDate(appointment.date)} às ${appointment.time}. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Qualquer ajuste, me responde por aqui.`
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

async function sendWhatsAppMessage(phone, message) {
  const url = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({
      phone,
      message,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Z-API error ${response.status}: ${errorText}`)
  }

  return response.json()
}

async function fetchAppointmentsForDate(targetDate) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, customer, phone, vehicle, plate, service, date, time, reconfirmation_sent_at, reminder_sent_at')
    .eq('date', targetDate)

  if (error) throw error

  return data || []
}

async function markSent(id, field) {
  const { error } = await supabase
    .from('appointments')
    .update({ [field]: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

async function processBatch({ daysBefore, sentField, buildMessage }) {
  const now = new Date()
  const targetDate = toDateOnly(addDays(now, daysBefore))
  const appointments = await fetchAppointmentsForDate(targetDate)

  const pending = appointments.filter((appointment) => !appointment[sentField])

  const results = []

  for (const appointment of pending) {
    const phone = normalizePhone(appointment.phone)

    if (!phone) {
      results.push({ id: appointment.id, status: 'skipped', reason: 'missing_phone' })
      continue
    }

    const message = buildMessage(appointment)

    try {
      await sendWhatsAppMessage(phone, message)
      await markSent(appointment.id, sentField)
      results.push({ id: appointment.id, status: 'sent', phone })
    } catch (error) {
      results.push({ id: appointment.id, status: 'error', phone, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return { targetDate, total: appointments.length, pending: pending.length, results }
}

const reconfirmation = await processBatch({
  daysBefore: 5,
  sentField: 'reconfirmation_sent_at',
  buildMessage: buildReconfirmationMessage,
})

const reminder = await processBatch({
  daysBefore: 3,
  sentField: 'reminder_sent_at',
  buildMessage: buildReminderMessage,
})

console.log(JSON.stringify({ reconfirmation, reminder }, null, 2))
