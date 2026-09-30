import { useMemo, useState } from 'react'
import { QuickAdd } from '../components/QuickAdd'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { usePlanner } from '../state/PlannerContext'
import type { TodoItem } from '../types'

export function TasksView({ scheduleTodo }: { scheduleTodo: (todo: TodoItem) => void }) {
  const { state, mutate, nextId } = usePlanner()
  const [filter, setFilter] = useState<'open'|'today'|'done'|'all'>('open')
  const [editing, setEditing] = useState<TodoItem | null>(null)
  const today = state.selectedDate
  const items = useMemo(() => state.todos.filter(t => filter === 'all' || filter === 'open' && !t.done || filter === 'done' && t.done || filter === 'today' && t.due === today && !t.done), [state.todos, filter, today])
  function add(title: string) {
    mutate('Task added', title, d => d.todos.unshift({ id: nextId('T'), title, done:false, due:'', domain:'', notes:'', createdAt:new Date().toISOString(), completedAt:null, scheduledEventId:null }))
  }
  function toggle(id: string) {
    const item = state.todos.find(t => t.id === id); if (!item) return
    mutate(item.done ? 'Task reopened' : 'Task completed', item.title, d => { const t = d.todos.find(x => x.id === id)!; t.done = !t.done; t.completedAt = t.done ? new Date().toISOString() : null })
  }
  function saveEdit() {
    if (!editing) return
    mutate('Task updated', editing.title, d => { const i=d.todos.findIndex(t=>t.id===editing.id); if(i>=0)d.todos[i]=editing })
    setEditing(null)
  }
  return <div className="view-stack">
    <section className="view-title"><div><div className="eyebrow">Lightweight Tasking</div><h1>Tasks</h1><p>Small obligations that do not need to live on the timeline.</p></div><span className="big-number">{state.todos.filter(t=>!t.done).length}</span></section>
    <section className="panel task-capture-panel"><QuickAdd placeholder="Type a task and press Enter…" buttonLabel="Add task" onAdd={add} /><div className="hint-line">Due date, domain and notes are optional. Add them only when useful.</div></section>
    <div className="segmented"><button className={filter==='open'?'active':''} onClick={()=>setFilter('open')}>Open</button><button className={filter==='today'?'active':''} onClick={()=>setFilter('today')}>Due today</button><button className={filter==='done'?'active':''} onClick={()=>setFilter('done')}>Done</button><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All</button></div>
    <section className="panel task-list-panel">
      {items.length ? items.map(t => <div className={`todo-row ${t.done?'done':''}`} key={t.id}>
        <button className={`check-button ${t.done?'checked':''}`} onClick={()=>toggle(t.id)} aria-label={t.done?'Reopen task':'Complete task'}>{t.done && <Icon name="check" />}</button>
        <button className="todo-copy" onClick={()=>setEditing(structuredClone(t))}><strong>{t.title}</strong><small>{[t.due && `Due ${t.due}`, t.domain, t.scheduledEventId && 'Scheduled'].filter(Boolean).join(' · ') || 'Simple task'}</small></button>
        <div className="row-actions"><button className="icon-button subtle" onClick={()=>scheduleTodo(t)} aria-label="Schedule"><Icon name="calendar" /></button><button className="icon-button subtle" onClick={()=>setEditing(structuredClone(t))} aria-label="Edit"><Icon name="edit" /></button></div>
      </div>) : <div className="empty-state">No tasks in this view.</div>}
    </section>
    <Modal open={!!editing} title="Edit task" eyebrow="Tasking" onClose={()=>setEditing(null)} footer={<><button className="button danger" onClick={()=>{ if(!editing)return; const scheduledId=editing.scheduledEventId; mutate('Task deleted',editing.title,d=>{d.todos=d.todos.filter(t=>t.id!==editing.id);if(scheduledId)d.events=d.events.filter(e=>e.id!==scheduledId)});setEditing(null)}}><Icon name="trash" />Delete</button><div className="spacer"/><button className="button" onClick={()=>setEditing(null)}>Cancel</button><button className="button primary" onClick={saveEdit}><Icon name="save" />Save task</button></>}>
      {editing && <div className="form-stack"><label>Task<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label><div className="form-grid"><label>Due<input type="date" value={editing.due} onChange={e=>setEditing({...editing,due:e.target.value})}/></label><label>Domain<select value={editing.domain} onChange={e=>setEditing({...editing,domain:e.target.value})}><option value="">None</option>{Object.entries(state.settings.domains).filter(([,v])=>v).map(([d])=><option key={d}>{d}</option>)}</select></label></div><label>Notes<textarea rows={5} value={editing.notes} onChange={e=>setEditing({...editing,notes:e.target.value})}/></label></div>}
    </Modal>
  </div>
}
