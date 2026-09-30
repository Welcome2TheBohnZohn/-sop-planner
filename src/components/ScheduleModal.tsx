import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { usePlanner } from '../state/PlannerContext'
import { blankWeek } from '../state/defaults'
import type { EventType, ScheduleSeed } from '../types'
import { minutes, startOfWeek, toTime } from '../utils/date'

export function ScheduleModal({ seed, onClose }: { seed: ScheduleSeed | null; onClose: () => void }) {
  const { state, mutate, nextId } = usePlanner()
  const existingEvent=seed?.eventId ? state.events.find(e=>e.id===seed.eventId) : undefined
  const [title,setTitle]=useState('')
  const [date,setDate]=useState('')
  const [time,setTime]=useState('09:00')
  const [duration,setDuration]=useState(30)
  const [type,setType]=useState<EventType>('Task')
  const [allDay,setAllDay]=useState(false)
  const [completed,setCompleted]=useState(false)
  const [confirmDelete,setConfirmDelete]=useState(false)

  useEffect(()=>{
    if(!seed)return
    const ev=seed.eventId ? state.events.find(e=>e.id===seed.eventId) : undefined
    setTitle(ev?.title||seed.title||'')
    setDate(ev?.date||seed.date)
    setTime(ev?.start||seed.time||'09:00')
    setDuration(ev?.start&&ev?.end ? Math.max(30,minutes(ev.end)-minutes(ev.start)) : 30)
    setType(ev?.type||seed.type||'Task')
    setAllDay(ev ? ev.allDay : Boolean(seed.allDay))
    setCompleted(Boolean(ev?.completed))
    setConfirmDelete(false)
  },[seed])

  function save(){
    if(!seed||!title.trim()||!date)return
    const start=allDay?'':time
    const end=allDay?'':toTime(minutes(time)+duration)
    const id=seed.eventId || nextId('EV')
    mutate(seed.eventId ? 'Scheduled item updated' : 'Scheduled item saved',title.trim(),d=>{
      const existing=seed.eventId ? d.events.find(e=>e.id===seed.eventId) : undefined
      if(existing){
        const from=`${existing.date} ${existing.start}-${existing.end}`
        const to=`${date} ${start}-${end}`
        if(from!==to)existing.moves.push({at:new Date().toISOString(),from,to})
        existing.date=date;existing.start=start;existing.end=end;existing.allDay=allDay;existing.title=title.trim();existing.type=type;existing.completed=type==='Task'?completed:false
      }else{
        d.events.push({id,date,start,end,allDay,title:title.trim(),type,completed:type==='Task'?completed:false,context:'',domain:'',original:{date,start,end,allDay},moves:[]})
      }
      if(!seed.eventId && seed.source?.kind==='todo'){
        const t=d.todos.find(x=>x.id===seed.source!.id);if(t)t.scheduledEventId=id
      }
      if(!seed.eventId && seed.source?.kind==='inbox'){
        const i=d.inbox.find(x=>x.id===seed.source!.id);if(i){i.status='scheduled';i.eventId=id;i.updatedAt=new Date().toISOString()}
      }
      if(!seed.eventId && seed.source?.kind==='tray'&&seed.source.weekKey){
        const w=d.weekPlans[seed.source.weekKey];if(w)w.tray=w.tray.filter(t=>t.id!==seed.source!.id)
      }
    })
    onClose()
  }

  function removeLinkedReferences(d:any,id:string){
    for(const t of d.todos)if(t.scheduledEventId===id)t.scheduledEventId=null
    for(const i of d.inbox)if(i.eventId===id){i.status='inbox';i.eventId=null;i.updatedAt=new Date().toISOString()}
  }

  function deleteEvent(){
    if(!seed?.eventId)return
    const id=seed.eventId
    const ev=state.events.find(e=>e.id===id)
    mutate('Scheduled item deleted',ev?.title||title,d=>{
      removeLinkedReferences(d,id)
      const item=d.events.find(e=>e.id===id)
      const match=String(item?.context||'').match(/^QUARTER_MILESTONE:([^:]+):(.+)$/)
      if(match){
        const q=d.quarterPlans[match[1]]
        if(q)q.milestones=q.milestones.filter((m:any)=>m.id!==match[2])
      }
      d.events=d.events.filter(e=>e.id!==id)
    })
    onClose()
  }

  function unscheduleEvent(){
    if(!seed?.eventId)return
    const id=seed.eventId
    const ev=state.events.find(e=>e.id===id)
    if(!ev)return
    mutate('Scheduled item unscheduled',ev.title,d=>{
      const item=d.events.find(e=>e.id===id)
      if(!item)return
      const todo=d.todos.find(t=>t.scheduledEventId===id)
      const inbox=d.inbox.find(i=>i.eventId===id)
      if(todo){
        todo.scheduledEventId=null
        d.events=d.events.filter(e=>e.id!==id)
        return
      }
      if(inbox){
        inbox.status='inbox';inbox.eventId=null;inbox.updatedAt=new Date().toISOString()
        d.events=d.events.filter(e=>e.id!==id)
        return
      }
      if(item.type==='Task'){
        const wk=startOfWeek(item.date)
        const w=d.weekPlans[wk]??blankWeek()
        d.weekPlans[wk]=w
        const estimate=Math.max(30,item.start&&item.end?minutes(item.end)-minutes(item.start):30)
        if(!w.tray.some(t=>t.title===item.title))w.tray.push({id:nextId('W'),title:item.title,estimateMin:estimate,domain:item.domain||'',inboxId:null})
        d.events=d.events.filter(e=>e.id!==id)
        return
      }
      item.allDay=true
      item.start=''
      item.end=''
      item.moves.push({at:new Date().toISOString(),from:`${ev.date} ${ev.start}-${ev.end}`,to:`${ev.date} unscheduled`})
    })
    onClose()
  }

  const canUnschedule=Boolean(existingEvent)&&!['Milestone','Decision Point','Deadline'].includes(existingEvent?.type||'')
  return <Modal open={!!seed} title={seed?.eventId ? "Edit scheduled item" : "Add to schedule"} eyebrow="Schedule" onClose={onClose} footer={<>
    {seed?.eventId&&<><button className="button danger" onClick={()=>confirmDelete?deleteEvent():setConfirmDelete(true)}><Icon name="trash"/>{confirmDelete?'Confirm delete':'Delete'}</button>{canUnschedule&&<button className="button" onClick={unscheduleEvent}><Icon name="archive"/>Unschedule</button>}<div className="spacer"/></>}
    <button className="button" onClick={onClose}>Cancel</button><button className="button primary" onClick={save}><Icon name="calendar"/>{seed?.eventId ? 'Save changes' : 'Save to schedule'}</button>
  </>}>
    <div className="form-stack">
      {confirmDelete&&<div className="delete-warning"><strong>Delete this scheduled item?</strong><span>Linked Tasks or Inbox items will be returned to their unscheduled state. Click Confirm delete to continue.</span></div>}
      <label>What are you doing?<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task, meeting, appointment, work block…"/></label>
      <div className="form-grid"><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Type<select value={type} onChange={e=>setType(e.target.value as EventType)}><option>Task</option><option>Event</option><option>Milestone</option><option>Decision Point</option><option>Deadline</option><option>Reminder</option></select></label></div>
      <label className="checkbox-line"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)}/><span>All day / unscheduled</span></label>
      {type==='Task'&&seed?.eventId&&<label className="checkbox-line completion-line"><input type="checkbox" checked={completed} onChange={e=>setCompleted(e.target.checked)}/><span>Completed</span></label>}
      {!allDay&&<div className="form-grid"><label>Start<input type="time" step="1800" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Duration<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1 hour 30 minutes</option><option value={120}>2 hours</option><option value={180}>3 hours</option><option value={240}>4 hours</option></select></label></div>}
    </div>
  </Modal>
}
