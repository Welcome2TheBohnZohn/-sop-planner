import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { usePlanner } from '../state/PlannerContext'
import type { EventType, ScheduleSeed } from '../types'
import { minutes, toTime } from '../utils/date'

export function ScheduleModal({ seed, onClose }: { seed: ScheduleSeed | null; onClose: () => void }) {
  const { mutate, nextId } = usePlanner()
  const [title,setTitle]=useState('')
  const [date,setDate]=useState('')
  const [time,setTime]=useState('09:00')
  const [duration,setDuration]=useState(30)
  const [type,setType]=useState<EventType>('Task')
  const [allDay,setAllDay]=useState(false)
  useEffect(()=>{if(seed){setTitle(seed.title||'');setDate(seed.date);setTime(seed.time||'09:00');setDuration(30);setType(seed.type||'Task');setAllDay(Boolean(seed.allDay))}},[seed])
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
        existing.date=date;existing.start=start;existing.end=end;existing.allDay=allDay;existing.title=title.trim();existing.type=type
      }else{
        d.events.push({id,date,start,end,allDay,title:title.trim(),type,completed:false,context:'',domain:'',original:{date,start,end,allDay},moves:[]})
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
  return <Modal open={!!seed} title={seed?.eventId ? "Edit scheduled item" : "Add to schedule"} eyebrow="Schedule" onClose={onClose} footer={<><button className="button" onClick={onClose}>Cancel</button><button className="button primary" onClick={save}><Icon name="calendar"/>{seed?.eventId ? 'Save changes' : 'Save to schedule'}</button></>}>
    <div className="form-stack">
      <label>What are you doing?<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task, meeting, appointment, work block…"/></label>
      <div className="form-grid"><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Type<select value={type} onChange={e=>setType(e.target.value as EventType)}><option>Task</option><option>Event</option><option>Milestone</option><option>Decision Point</option><option>Deadline</option><option>Reminder</option></select></label></div>
      <label className="checkbox-line"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)}/><span>All day / unscheduled</span></label>
      {!allDay&&<div className="form-grid"><label>Start<input type="time" step="1800" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Duration<select value={duration} onChange={e=>setDuration(Number(e.target.value))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1 hour 30 minutes</option><option value={120}>2 hours</option><option value={180}>3 hours</option><option value={240}>4 hours</option></select></label></div>}
    </div>
  </Modal>
}
