import type { AppView } from '../types'
import { usePlanner } from '../state/PlannerContext'
import { formatDay, startOfWeek } from '../utils/date'
import { Icon } from '../components/Icon'

export function HomeView({ navigate }: { navigate: (view: AppView) => void }) {
  const { state, week, quarter } = usePlanner()
  const today = state.selectedDate
  const todayEvents = state.events.filter(e => e.date === today && !e.completed).sort((a,b) => a.start.localeCompare(b.start))
  const w = week(today)
  const q = quarter(today)
  const nextMilestone = [...q.milestones].filter(m => m.date >= today).sort((a,b) => a.date.localeCompare(b.date))[0]
  const blocked = q.goals.filter(g => g.status === 'Blocked' || g.status === 'At Risk')
  const inbox = state.inbox.filter(i => i.status === 'inbox').slice(0, 4)
  return <div className="view-stack">
    <section className="hero-panel">
      <div><div className="eyebrow">Today · {formatDay(today, { weekday:'long', month:'long', day:'numeric' })}</div><h1>{state.dayPlans[today]?.focus || 'Decide what matters today.'}</h1></div>
      <button className="button primary" onClick={() => navigate('day')}><Icon name="day" />Open Day</button>
    </section>
    <div className="home-grid">
      <button className="insight-card" onClick={() => navigate('day')}><span className="eyebrow">Next scheduled</span><strong>{todayEvents[0] ? `${todayEvents[0].start || 'All day'} · ${todayEvents[0].title}` : 'Nothing scheduled'}</strong><small>Open today’s execution view</small></button>
      <button className="insight-card" onClick={() => navigate('week')}><span className="eyebrow">Week / Main Effort</span><strong>{w.main || 'Set this week’s main effort'}</strong><small>Week of {formatDay(startOfWeek(today), { month:'short', day:'numeric' })}</small></button>
      <button className="insight-card" onClick={() => navigate('quarter')}><span className="eyebrow">Next milestone</span><strong>{nextMilestone?.title || 'No milestone scheduled'}</strong><small>{nextMilestone ? formatDay(nextMilestone.date, { month:'short', day:'numeric' }) : 'Quarter map'}</small></button>
      <button className="insight-card" onClick={() => navigate('tasks')}><span className="eyebrow">Open tasking</span><strong>{state.todos.filter(t => !t.done).length} open</strong><small>{state.todos.filter(t => t.due === today && !t.done).length} due today</small></button>
    </div>
    <div className="two-col">
      <section className="panel">
        <div className="section-head"><div><div className="eyebrow">At Risk / Blocked</div><h2>Attention</h2></div><Icon name="target" /></div>
        {blocked.length ? blocked.map(g => <div className="list-row" key={g.id}><div><strong>{g.title || 'Untitled goal'}</strong><small>{g.status}{g.dependency ? ` · ${g.dependency}` : ''}</small></div><span className={`status-pill ${g.status.toLowerCase().replace(' ','-')}`}>{g.status}</span></div>) : <div className="empty-state">No quarter goals are currently marked At Risk or Blocked.</div>}
      </section>
      <section className="panel">
        <div className="section-head"><div><div className="eyebrow">Inbox</div><h2>Uncommitted</h2></div><span className="count-badge">{state.inbox.filter(i => i.status === 'inbox').length}</span></div>
        {inbox.length ? inbox.map(i => <div className="list-row" key={i.id}><div><strong>{i.title}</strong><small>{i.domain || 'No domain'} · {i.estimateMin} min</small></div></div>) : <div className="empty-state">Inbox is clear.</div>}
      </section>
    </div>
  </div>
}
