import './App.css'

type RoutineItem = {
  title: string
  status: 'feito' | 'pendente' | 'atrasado'
  time: string
}

type MetricCard = {
  label: string
  value: string
  hint: string
}

const metrics: MetricCard[] = [
  { label: 'Água', value: '3.2 / 5L', hint: '64% da meta hoje' },
  { label: 'Refeições', value: '3 / 5', hint: '2 pendentes no dia' },
  { label: 'Treino', value: 'Hoje 19:30', hint: 'Academia programada' },
  { label: 'Gastos do mês', value: 'R$ 595', hint: 'Atualizado em abril' },
]

const routine: RoutineItem[] = [
  { title: 'Devocional', status: 'feito', time: '05:15' },
  { title: 'Pedal', status: 'feito', time: '06:00' },
  { title: 'Segunda refeição', status: 'feito', time: '10:00' },
  { title: 'Almoço', status: 'pendente', time: '12:00' },
  { title: 'Academia', status: 'pendente', time: '19:30' },
  { title: 'Dormir', status: 'atrasado', time: '22:30' },
]

const tasks = [
  'Ver gastos pessoais do mês',
  'Confirmar horário de cortar cabelo',
  'Revisar prioridades da AutoHolic',
]

const expenses = [
  { category: 'Casa', value: 'R$ 495', note: 'Luz' },
  { category: 'Mercado', value: 'R$ 100', note: 'Frutas' },
]

function App() {
  return (
    <main className="dashboard-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Dashboard pessoal</p>
          <h1>Resumo do dia do Leo</h1>
          <p className="hero-text">
            Um painel simples para rotina, saúde, compromissos e financeiro pessoal.
          </p>
        </div>

        <div className="focus-box">
          <span className="focus-label">Foco do dia</span>
          <strong>Clareza, constância e execução.</strong>
          <p>Ver o que está pendente sem se perder no operacional.</p>
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
              <p className="eyebrow">Rotina</p>
              <h2>Check-in do dia</h2>
            </div>
            <button>Atualizar status</button>
          </div>

          <div className="routine-list">
            {routine.map((item) => (
              <div className="routine-item" key={item.title}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.time}</span>
                </div>
                <span className={`status status-${item.status}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">Agenda e foco</p>
          <h2>Próximas pendências</h2>
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Financeiro pessoal</p>
          <h2>Últimos lançamentos</h2>
          <div className="expense-list">
            {expenses.map((expense) => (
              <div className="expense-item" key={expense.note}>
                <div>
                  <strong>{expense.note}</strong>
                  <span>{expense.category}</span>
                </div>
                <strong>{expense.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel-highlight">
          <p className="eyebrow">Consistência semanal</p>
          <h2>Semana atual</h2>
          <div className="consistency-row">
            <div>
              <span>Rotina</span>
              <strong>82%</strong>
            </div>
            <div>
              <span>Treino</span>
              <strong>4/5</strong>
            </div>
            <div>
              <span>Refeições</span>
              <strong>16/20</strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
