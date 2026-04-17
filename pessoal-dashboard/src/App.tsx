import { useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
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
  {
    id: 3,
    customer: 'Camila Souza',
    phone: '(31) 97777-9911',
    vehicle: 'Audi A3',
    plate: 'UIO-4455',
    service: 'Troca de óleo e filtros',
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
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [syncMessage, setSyncMessage] = useState('MVP pronto para organizar agendamentos e confirmar com cliente.')
  const [authLoading] = useState(false)
  const [session] = useState<Session | null>({ user: { id: 'local-demo' } } as Session)

  const todayAppointments = useMemo(
    () => appointments.filter((item) => item.date === '2026-04-18'),
    [appointments],
  )

  const confirmedCount = appointments.filter((item) => item.status === 'Confirmado').length
  const inProgressCount = appointments.filter((item) => item.status === 'Em atendimento').length
  const finishedCount = appointments.filter((item) => item.status === 'Finalizado').length

  const metrics = [
    {
      label: 'Agendamentos totais',
      value: String(appointments.length),
      hint: 'Base inicial do MVP',
    },
    {
      label: 'Confirmados',
      value: String(confirmedCount),
      hint: 'Prontos para atendimento',
    },
    {
      label: 'Em atendimento',
      value: String(inProgressCount),
      hint: 'Carros na operação',
    },
    {
      label: 'Finalizados',
      value: String(finishedCount),
      hint: 'Entregas concluídas',
    },
  ]

  function handleFakeLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSyncMessage('Modo demonstração liberado. Próximo passo é conectar com banco e autenticação real.')
  }

  async function handleSignUp() {
    setSyncMessage('Nesse MVP, a criação de conta fica para a próxima etapa.')
  }

  async function handleSignOut() {
    setSyncMessage('Sessão de demonstração encerrada.')
  }

  function handleAppointmentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (Object.values(form).some((value) => !value.trim())) {
      setSyncMessage('Preenche todos os campos do agendamento.')
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
    setSyncMessage(`Agendamento criado para ${newAppointment.customer}.`) 
  }

  function updateAppointmentStatus(id: number, status: AppointmentStatus) {
    setAppointments((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    )
    setSyncMessage(`Status atualizado para ${status}.`)
  }

  function copyCustomerMessage(appointment: Appointment) {
    const message = buildCustomerMessage(appointment)

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(message)
      setSyncMessage(`Mensagem de ${appointment.customer} copiada para enviar no WhatsApp.`)
      return
    }

    setSyncMessage(message)
  }

  if (authLoading) {
    return <main className="dashboard-shell"><div className="empty-state">Verificando acesso...</div></main>
  }

  if (!session) {
    return (
      <main className="dashboard-shell auth-shell">
        <section className="hero-card auth-card">
          <div>
            <p className="eyebrow">AutoHolic Agenda</p>
            <h1>Entrar no painel</h1>
            <p className="hero-text">Organize agendamentos, clientes e confirmações em um lugar só.</p>
            <small className="sync-message">{syncMessage}</small>
          </div>

          <form className="auth-form" onSubmit={handleFakeLogin}>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
            />
            <input
              type="password"
              placeholder="Sua senha"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
            />
            <button type="submit">Entrar</button>
            <button type="button" className="ghost-button" onClick={handleSignUp}>
              Criar conta
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">AutoHolic Agenda</p>
          <h1>Agendamento de carros</h1>
          <p className="hero-text">
            Um MVP para organizar entrada de veículos, confirmar clientes e deixar a oficina mais profissional.
          </p>
        </div>

        <div className="focus-box">
          <span className="focus-label">Foco do dia</span>
          <strong>Agenda organizada e cliente bem atendido.</strong>
          <p>Confirma rápido, evita choque de horário e reforça o padrão premium da AutoHolic.</p>
          <small className="sync-message">{syncMessage}</small>
          <button type="button" className="ghost-button signout-button" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </section>

      <section className="metric-grid">
        {metrics.map((item) => (
          <article className="metric-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
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
            <div className="panel-actions">
              <span className="panel-badge">MVP inicial</span>
            </div>
          </div>

          <div className="appointment-list">
            {appointments.map((appointment) => (
              <div className="appointment-card" key={appointment.id}>
                <div className="appointment-main">
                  <div>
                    <strong>{appointment.customer}</strong>
                    <span>{appointment.vehicle} • {appointment.plate}</span>
                  </div>
                  <div className="appointment-datetime">
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
                      className={appointment.status === status ? `status status-active` : 'status-button'}
                      onClick={() => updateAppointmentStatus(appointment.id, status)}
                    >
                      {status}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => copyCustomerMessage(appointment)}
                  >
                    Copiar mensagem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Hoje</p>
          <h2>Fila do dia</h2>
          <div className="task-list">
            {todayAppointments.map((item) => (
              <div className="task-card" key={item.id}>
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
              <h2>Cadastrar cliente e carro</h2>
            </div>
          </div>

          <form className="appointment-form" onSubmit={handleAppointmentSubmit}>
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

        <article className="panel panel-highlight">
          <p className="eyebrow">Mensagem ao cliente</p>
          <h2>Fluxo sugerido</h2>
          <div className="consistency-row single-column">
            <div>
              <span>1. Criar</span>
              <strong>Cadastro rápido</strong>
            </div>
            <div>
              <span>2. Confirmar</span>
              <strong>Enviar WhatsApp</strong>
            </div>
            <div>
              <span>3. Atender</span>
              <strong>Atualizar status</strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
