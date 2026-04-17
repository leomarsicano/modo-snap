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

const initialAppointments: Appointment[] = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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

const statusOptions: AppointmentStatus[] = ['Novo', 'Confirmado', 'Em atendimento', 'Finalizado']

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T12:00:00`))
}

function buildCustomerMessage(appointment: Appointment) {
  return `Olá, ${appointment.customer}. Seu agendamento na AutoHolic foi ${appointment.status.toLowerCase()} para ${formatDate(appointment.date)} às ${appointment.time}. Veículo: ${appointment.vehicle} | Placa: ${appointment.plate}. Serviço: ${appointment.service}. Consultor: ${appointment.advisor}. Se precisar remarcar, responde aqui.`
}

function App() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
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
  const [message, setMessage] = useState('Nova base do app pronta para virar agenda real da AutoHolic.')

  const todayAppointments = useMemo(
    () => appointments.filter((item) => item.date === '2026-04-18'),
    [appointments],
  )

  const uniqueCustomers = new Set(appointments.map((item) => item.customer)).size
  const uniqueVehicles = new Set(appointments.map((item) => item.plate)).size
  const confirmedCount = appointments.filter((item) => item.status === 'Confirmado').length

  const metrics = [
    {
      label: 'Agendamentos',
      value: String(appointments.length),
      hint: 'Volume total no MVP',
    },
    {
      label: 'Clientes ativos',
      value: String(uniqueCustomers),
      hint: 'Clientes com agenda aberta',
    },
    {
      label: 'Veículos na base',
      value: String(uniqueVehicles),
      hint: 'Carros já cadastrados',
    },
    {
      label: 'Confirmados',
      value: String(confirmedCount),
      hint: 'Prontos para receber',
    },
  ]

  const nextCustomers = appointments.slice(0, 3)

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
      advisor: form.advisor.trim(),
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
      advisor: '',
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
            Estrutura inicial para deixar a oficina mais organizada, previsível e profissional no atendimento.
          </p>
        </div>

        <div className="focus-box">
          <span className="focus-label">Foco agora</span>
          <strong>Cliente, veículo e agenda no mesmo fluxo.</strong>
          <p>Organizar a recepção e facilitar a confirmação com mensagem pronta.</p>
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
              <h2>Próximos agendamentos</h2>
            </div>
            <span className="panel-badge">MVP profissional</span>
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
                  <span>Consultor: {appointment.advisor}</span>
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
          <p className="eyebrow">Operação do dia</p>
          <h2>Entradas de hoje</h2>
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
          <p className="eyebrow">Clientes</p>
          <h2>Próximos atendimentos</h2>
          <div className="client-list">
            {nextCustomers.map((item) => (
              <div className="client-item" key={item.id}>
                <strong>{item.customer}</strong>
                <span>{item.phone}</span>
                <small>{item.vehicle} • {item.plate}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Novo agendamento</p>
              <h2>Cadastro rápido</h2>
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
            <button type="submit">Criar agendamento</button>
          </form>
        </article>
      </section>
    </main>
  )
}

export default App
