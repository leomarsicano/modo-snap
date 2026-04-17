import { useMemo, useState } from 'react'
import './App.css'

type AppointmentStatus = 'Novo' | 'Confirmado' | 'Em atendimento' | 'Finalizado'

type Appointment = {
  id: number
  customer: string
  phone: string
  vehicle: string
  plate: string
  service: string
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
  date: string
  time: string
}

const initialAppointments: Appointment[] = [
  {
    id: 1,
    customer: 'Bruno Carvalho',
    phone: '(31) 99999-1234',
    vehicle: 'Audi Q3',
    plate: 'QWE-1234',
    service: 'Revisão preventiva',
    date: '2026-04-18',
    time: '08:30',
    status: 'Confirmado',
  },
  {
    id: 2,
    customer: 'Marcos Vieira',
    phone: '(31) 98888-4567',
    vehicle: 'VW Tiguan',
    plate: 'RTY-7788',
    service: 'Diagnóstico de ruído',
    date: '2026-04-18',
    time: '10:00',
    status: 'Novo',
  },
]

const statusOptions: AppointmentStatus[] = ['Novo', 'Confirmado', 'Em atendimento', 'Finalizado']

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T12:00:00`))
}

function buildCustomerMessage(appointment: Appointment) {
  return `Olá, ${appointment.customer}. Seu agendamento na AutoHolic foi ${appointment.status.toLowerCase()} para ${formatDate(appointment.date)} às ${appointment.time}. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Serviço: ${appointment.service}. Se precisar remarcar, responde aqui.`
}

function App() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [form, setForm] = useState<AppointmentForm>({
    customer: '',
    phone: '',
    vehicle: '',
    plate: '',
    service: '',
    date: '',
    time: '',
  })
  const [message, setMessage] = useState('Primeira versão do app de agendamento da AutoHolic.')

  const todayAppointments = useMemo(
    () => appointments.filter((item) => item.date === '2026-04-18'),
    [appointments],
  )

  const metrics = [
    {
      label: 'Agendamentos',
      value: String(appointments.length),
      hint: 'Total no MVP',
    },
    {
      label: 'Confirmados',
      value: String(appointments.filter((item) => item.status === 'Confirmado').length),
      hint: 'Prontos para atendimento',
    },
    {
      label: 'Hoje',
      value: String(todayAppointments.length),
      hint: 'Entradas previstas no dia',
    },
    {
      label: 'Mensagens',
      value: 'WhatsApp',
      hint: 'Fluxo manual por enquanto',
    },
  ]

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (Object.values(form).some((value) => !value.trim())) {
      setMessage('Preenche todos os campos para criar o agendamento.')
      return
    }

    const newAppointment: Appointment = {
      id: Date.now(),
      customer: form.customer.trim(),
      phone: form.phone.trim(),
      vehicle: form.vehicle.trim(),
      plate: form.plate.trim().toUpperCase(),
      service: form.service.trim(),
      date: form.date,
      time: form.time,
      status: 'Novo',
    }

    setAppointments((current) => [newAppointment, ...current])
    setForm({
      customer: '',
      phone: '',
      vehicle: '',
      plate: '',
      service: '',
      date: '',
      time: '',
    })
    setMessage(`Agendamento criado para ${newAppointment.customer}.`)
  }

  function updateStatus(id: number, status: AppointmentStatus) {
    setAppointments((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    setMessage(`Status atualizado para ${status}.`)
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
            Primeira versão para organizar clientes, veículos, horários e confirmação de atendimento.
          </p>
        </div>

        <div className="focus-box">
          <span className="focus-label">Objetivo</span>
          <strong>Deixar a oficina mais profissional.</strong>
          <p>Agenda clara, menos desencontro e mensagem pronta pro cliente.</p>
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
              <p className="eyebrow">Agenda</p>
              <h2>Próximos agendamentos</h2>
            </div>
            <span className="panel-badge">MVP</span>
          </div>

          <div className="appointment-list">
            {appointments.map((appointment) => (
              <div className="appointment-card" key={appointment.id}>
                <div className="appointment-main">
                  <div>
                    <strong>{appointment.customer}</strong>
                    <span>{appointment.vehicle} • {appointment.plate}</span>
                  </div>
                  <div className="appointment-date">
                    <strong>{formatDate(appointment.date)}</strong>
                    <span>{appointment.time}</span>
                  </div>
                </div>

                <div className="appointment-meta">
                  <span>{appointment.service}</span>
                  <span>{appointment.phone}</span>
                </div>

                <div className="appointment-actions">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={appointment.status === status ? 'status status-active' : 'status-button'}
                      onClick={() => updateStatus(appointment.id, status)}
                    >
                      {status}
                    </button>
                  ))}

                  <button type="button" className="ghost-button" onClick={() => copyMessage(appointment)}>
                    Copiar mensagem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Hoje</p>
          <h2>Entradas do dia</h2>
          <div className="day-list">
            {todayAppointments.map((item) => (
              <div className="day-item" key={item.id}>
                <strong>{item.time} • {item.customer}</strong>
                <span>{item.vehicle} • {item.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Novo agendamento</p>
              <h2>Cadastrar cliente</h2>
            </div>
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
              type="date"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
            <input
              type="time"
              value={form.time}
              onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
            />
            <button type="submit">Criar agendamento</button>
          </form>
        </article>
      </section>
    </main>
  )
}

export default App
