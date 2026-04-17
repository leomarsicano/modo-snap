import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

type AppointmentStatus = 'Novo' | 'Confirmado' | 'Em atendimento' | 'Finalizado'

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
  status: AppointmentStatus
}

type AppointmentForm = {
  customer: string
  phone: string
  vehicle: string
  plate: string
  service: string
  advisor: string
  date: string
  time: string
}

const initialAppointments: Omit<Appointment, 'id'>[] = [
  {
    customer: 'Bruno Carvalho',
    phone: '(31) 99999-1234',
    vehicle: 'Audi Q3',
    plate: 'QWE-1234',
    service: 'Revisão preventiva',
    advisor: 'Leonardo',
    date: '2026-04-18',
    time: '08:30',
    status: 'Confirmado',
  },
  {
    customer: 'Marcos Vieira',
    phone: '(31) 98888-4567',
    vehicle: 'VW Tiguan',
    plate: 'RTY-7788',
    service: 'Diagnóstico de ruído',
    advisor: 'Bruna',
    date: '2026-04-18',
    time: '10:00',
    status: 'Novo',
  },
  {
    customer: 'Camila Souza',
    phone: '(31) 97777-9911',
    vehicle: 'Audi A3',
    plate: 'UIO-4455',
    service: 'Troca de óleo e filtros',
    advisor: 'Leonardo',
    date: '2026-04-19',
    time: '14:00',
    status: 'Em atendimento',
  },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T12:00:00`))
}

function formatDateForInput(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}-${month}-${year}`
}

function parseDateInput(value: string) {
  const match = value.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/)

  if (!match) {
    return null
  }

  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function getWeekRange(reference = new Date(), weekOffset = 0) {
  const current = new Date(reference)
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const start = new Date(current)
  start.setDate(current.getDate() + diffToMonday + weekOffset * 7)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function formatWeekLabel(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })

  return `${formatter.format(start)} até ${formatter.format(end)}`
}

function buildCalendarDays(reference: Date) {
  const startOfMonth = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const endOfMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)
  const startDay = startOfMonth.getDay()
  const daysToShowBefore = startDay === 0 ? 6 : startDay - 1
  const calendarStart = new Date(startOfMonth)
  calendarStart.setDate(startOfMonth.getDate() - daysToShowBefore)

  const days = []
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(calendarStart)
    current.setDate(calendarStart.getDate() + index)
    days.push(current)
  }

  return { days, startOfMonth, endOfMonth }
}

function buildCustomerMessage(appointment: Appointment) {
  return `Olá, ${appointment.customer}. Seu agendamento na AutoHolic foi ${appointment.status.toLowerCase()} para ${formatDate(appointment.date)} às ${appointment.time}. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Serviço: ${appointment.service}. Consultor: ${appointment.advisor}. Se precisar remarcar, responde aqui.`
}

function App() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showNewAppointmentForm, setShowNewAppointmentForm] = useState(false)
  const [form, setForm] = useState<AppointmentForm>({
    customer: '',
    phone: '',
    vehicle: '',
    plate: '',
    service: '',
    advisor: '',
    date: '',
    time: '',
  })
  const [message, setMessage] = useState('Conectando agenda ao Supabase...')
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    async function loadAppointments() {
      setLoading(true)

      const { data, error } = await supabase
        .from('appointments')
        .select('id, customer, phone, vehicle, plate, service, advisor, date, time, status')
        .order('date', { ascending: true })
        .order('time', { ascending: true })

      if (error) {
        setAppointments([])
        setMessage(`Erro ao carregar agenda: ${error.message}`)
        setLoading(false)
        return
      }

      if (!data?.length) {
        const { data: seededData, error: seedError } = await supabase
          .from('appointments')
          .insert(initialAppointments)
          .select('id, customer, phone, vehicle, plate, service, advisor, date, time, status')

        if (seedError) {
          setAppointments([])
          setMessage(`Erro ao criar agenda inicial: ${seedError.message}`)
          setLoading(false)
          return
        }

        setAppointments((seededData as Appointment[]) ?? [])
        setMessage('Agenda conectada. Base inicial criada no banco.')
        setLoading(false)
        return
      }

      setAppointments(data as Appointment[])
      setMessage('Agenda conectada ao banco com sucesso.')
      setLoading(false)
    }

    loadAppointments()
  }, [])

  const selectedWeek = useMemo(() => getWeekRange(new Date(), weekOffset), [weekOffset])

  const currentWeekAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const appointmentDate = new Date(`${item.date}T12:00:00`)
      return appointmentDate >= selectedWeek.start && appointmentDate <= selectedWeek.end
    })
  }, [appointments, selectedWeek])

  const todayAppointments = useMemo(() => {
    const today = new Date()
    const todayDate = new Date(today)
    todayDate.setHours(0, 0, 0, 0)

    return appointments.filter((item) => {
      const appointmentDate = new Date(`${item.date}T12:00:00`)
      appointmentDate.setHours(0, 0, 0, 0)
      return appointmentDate.getTime() === todayDate.getTime()
    })
  }, [appointments])

  const weeklyActiveAppointments = currentWeekAppointments.filter((item) => item.status !== 'Finalizado')

  const metrics = [
    {
      label: 'Agendamentos',
      value: String(weeklyActiveAppointments.length),
      hint: 'Volume ativo da semana selecionada',
    },
    {
      label: 'Confirmados',
      value: String(weeklyActiveAppointments.filter((item) => item.status === 'Confirmado').length),
      hint: 'Prontos para receber',
    },
  ]

  const nextCustomers = currentWeekAppointments.slice(0, 3)

  const calendarReference = selectedWeek.start
  const { days: calendarDays, startOfMonth, endOfMonth } = useMemo(
    () => buildCalendarDays(calendarReference),
    [calendarReference],
  )
  const currentMonthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(calendarReference)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('Preenche todos os campos para criar o agendamento.')
      return
    }

    const payload = {
      customer: form.customer.trim(),
      phone: form.phone.trim(),
      vehicle: form.vehicle.trim(),
      plate: form.plate.trim().toUpperCase(),
      service: form.service.trim(),
      advisor: form.advisor.trim(),
      date: form.date,
      time: form.time,
      status: 'Novo' as AppointmentStatus,
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select('id, customer, phone, vehicle, plate, service, advisor, date, time, status')
      .single()

    if (error || !data) {
      setMessage(`Erro ao criar agendamento: ${error?.message ?? 'erro desconhecido'}`)
      return
    }

    setAppointments((current) => [data as Appointment, ...current])
    setForm({
      customer: '',
      phone: '',
      vehicle: '',
      plate: '',
      service: '',
      advisor: '',
      date: '',
      time: '',
    })
    setShowNewAppointmentForm(false)
    setMessage(`Agendamento criado para ${data.customer}.`)
  }

  async function updateStatus(id: number, status: AppointmentStatus) {
    const previous = appointments
    setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))

    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select('id, customer, phone, vehicle, plate, service, advisor, date, time, status')
      .single()

    if (error || !data) {
      setAppointments(previous)
      setMessage(`Erro ao atualizar status: ${error?.message ?? 'erro desconhecido'}`)
      return
    }

    setAppointments((current) => current.map((item) => (item.id === id ? (data as Appointment) : item)))
    setMessage(`Status atualizado para ${status}.`)
  }

  async function unconfirmAppointment(id: number) {
    await updateStatus(id, 'Novo')
  }

  async function rescheduleAppointment(appointment: Appointment) {
    const rawDate = window.prompt('Nova data do agendamento (DD-MM-AAAA):', formatDateForInput(appointment.date))

    if (!rawDate) {
      return
    }

    const parsedDate = parseDateInput(rawDate)

    if (!parsedDate) {
      setMessage('Data inválida. Use o formato DD-MM-AAAA.')
      return
    }

    if (parsedDate === appointment.date) {
      return
    }

    const previous = appointments
    setAppointments((current) => current.map((item) => (item.id === appointment.id ? { ...item, date: parsedDate } : item)))

    const { data, error } = await supabase
      .from('appointments')
      .update({ date: parsedDate })
      .eq('id', appointment.id)
      .select('id, customer, phone, vehicle, plate, service, advisor, date, time, status')
      .single()

    if (error || !data) {
      setAppointments(previous)
      setMessage(`Erro ao remarcar: ${error?.message ?? 'erro desconhecido'}`)
      return
    }

    setAppointments((current) => current.map((item) => (item.id === appointment.id ? (data as Appointment) : item)))
    setMessage(`Agendamento de ${appointment.customer} remarcado para ${formatDate(parsedDate)}.`)
  }

  async function deleteAppointment(appointment: Appointment) {
    const confirmed = window.confirm(`Excluir o agendamento de ${appointment.customer}?`)

    if (!confirmed) {
      return
    }

    const previous = appointments
    setAppointments((current) => current.filter((item) => item.id !== appointment.id))

    const { error } = await supabase.from('appointments').delete().eq('id', appointment.id)

    if (error) {
      setAppointments(previous)
      setMessage(`Erro ao excluir agendamento: ${error.message}`)
      return
    }

    setMessage(`Agendamento de ${appointment.customer} excluído.`)
  }

  async function copyMessage(appointment: Appointment) {
    const text = buildCustomerMessage(appointment)

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      setMessage(`Mensagem de ${appointment.customer} copiada.`)
      return
    }

    setMessage(text)
  }

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">AutoHolic Agenda</p>
          <h1>Agendamento de carros</h1>
          <p className="hero-text">
            Estrutura inicial para deixar a oficina mais organizada, previsível e profissional no atendimento.
          </p>
        </div>

        <div className="focus-box">
          <span className="focus-label">Foco agora</span>
          <strong>Cliente, veículo e agenda no mesmo fluxo.</strong>
          <p>Organizar a recepção e facilitar a confirmação com mensagem pronta.</p>
          <button type="button" className="primary-button" onClick={() => setShowNewAppointmentForm((current) => !current)}>
            {showNewAppointmentForm ? 'Fechar novo agendamento' : 'Novo agendamento'}
          </button>
          <small className="sync-message">{message}</small>
        </div>
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel panel-large">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Agenda principal</p>
              <h2>Agendamentos da semana</h2>
            </div>
            <div className="week-navigation">
              <button type="button" className="ghost-button" onClick={() => setWeekOffset((current) => current - 1)}>
                ← Semana anterior
              </button>
              <span className="panel-badge">{formatWeekLabel(selectedWeek.start, selectedWeek.end)}</span>
              <button type="button" className="ghost-button" onClick={() => setWeekOffset((current) => current + 1)}>
                Próxima semana →
              </button>
            </div>
          </div>

          <div className="appointment-list">
            {loading ? (
              <div className="empty-state">Carregando agenda...</div>
            ) : currentWeekAppointments.length ? (
              currentWeekAppointments.map((appointment) => (
                <div className="appointment-card" key={appointment.id}>
                  <div className="appointment-main">
                    <div className="appointment-identity">
                      <div className="appointment-topline">
                        <div className="appointment-topline-left">
                          <strong>{appointment.customer}</strong>
                          <span>{appointment.phone}</span>
                        </div>
                        <span className="appointment-consultant">Consultor: {appointment.advisor}</span>
                      </div>
                      <span>{appointment.vehicle}</span>
                      <span>{appointment.plate}</span>
                    </div>
                    <div className="appointment-date">
                      <strong>{formatDate(appointment.date)}</strong>
                      <span>{appointment.time}</span>
                    </div>
                  </div>

                  <div className="appointment-meta">
                    <span>Serviço desejado: {appointment.service}</span>
                  </div>

                  <div className="appointment-actions">
                    <button
                      type="button"
                      className={appointment.status === 'Confirmado' ? 'status status-active' : 'status-button'}
                      onClick={() => updateStatus(appointment.id, 'Confirmado')}
                    >
                      Confirmado
                    </button>

                    <button type="button" className="ghost-button" onClick={() => unconfirmAppointment(appointment.id)}>
                      Desmarcar
                    </button>

                    <button type="button" className="ghost-button" onClick={() => rescheduleAppointment(appointment)}>
                      Trocar data
                    </button>

                    <button type="button" className="ghost-button danger-button" onClick={() => deleteAppointment(appointment)}>
                      Excluir
                    </button>

                    <button type="button" className="ghost-button" onClick={() => copyMessage(appointment)}>
                      Copiar mensagem
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Nenhum agendamento encontrado.</div>
            )}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Calendário</p>
          <h2>{currentMonthLabel}</h2>
          <div className="calendar-weekdays">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const isoDate = day.toISOString().slice(0, 10)
              const hasAppointment = appointments.some((item) => item.date === isoDate)
              const isCurrentMonth = day >= startOfMonth && day <= endOfMonth
              const isToday = isoDate === new Date().toISOString().slice(0, 10)
              const isInsideSelectedWeek = day >= selectedWeek.start && day <= selectedWeek.end

              return (
                <div
                  key={isoDate}
                  className={[
                    'calendar-day',
                    isCurrentMonth ? 'calendar-day-current' : 'calendar-day-muted',
                    isToday ? 'calendar-day-today' : '',
                    isInsideSelectedWeek ? 'calendar-day-selected' : '',
                    hasAppointment ? 'calendar-day-has-appointment' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {day.getDate()}
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Operação do dia</p>
          <h2>Entradas de hoje</h2>
          <div className="day-list">
            {todayAppointments.length ? (
              todayAppointments.map((item) => (
                <div className="day-item" key={item.id}>
                  <strong>{item.time} • {item.customer}</strong>
                  <span>{item.vehicle} • {item.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">Sem entradas para hoje.</div>
            )}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Clientes</p>
          <h2>Próximos atendimentos</h2>
          <div className="client-list">
            {nextCustomers.length ? (
              nextCustomers.map((item) => (
                <div className="client-item" key={item.id}>
                  <strong>{item.customer}</strong>
                  <span>{item.phone}</span>
                  <small>{item.vehicle} • {item.plate}</small>
                </div>
              ))
            ) : (
              <div className="empty-state">Sem clientes agendados.</div>
            )}
          </div>
        </article>

        {showNewAppointmentForm ? (
          <div className="modal-overlay" onClick={() => setShowNewAppointmentForm(false)}>
            <article className="panel modal-panel" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Novo agendamento</p>
                  <h2>Preencher dados</h2>
                </div>
                <button type="button" className="ghost-button" onClick={() => setShowNewAppointmentForm(false)}>
                  Fechar
                </button>
              </div>

              <form className="appointment-form" onSubmit={handleSubmit}>
                <input
                  placeholder="Nome do cliente"
                  value={form.customer}
                  onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))}
                />
                <input
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
                <input
                  placeholder="Veículo"
                  value={form.vehicle}
                  onChange={(event) => setForm((current) => ({ ...current, vehicle: event.target.value }))}
                />
                <input
                  placeholder="Placa"
                  value={form.plate}
                  onChange={(event) => setForm((current) => ({ ...current, plate: event.target.value }))}
                />
                <input
                  placeholder="Serviço desejado"
                  value={form.service}
                  onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
                />
                <input
                  placeholder="Consultor responsável"
                  value={form.advisor}
                  onChange={(event) => setForm((current) => ({ ...current, advisor: event.target.value }))}
                />
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                />
                <button type="submit">Salvar agendamento</button>
              </form>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App
