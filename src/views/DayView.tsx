import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '../components/Icon'
import { usePlanner } from '../state/PlannerContext'
import { blankDay } from '../state/defaults'
import type { PlanEvent, ScheduleSeed } from '../types'
import { formatDay, minutes, toTime } from '../utils/date'

const START=4*60,END=22*60,STEP=30,ROW=30

type Drag={id:string,kind:'move'|'top'|'bottom',startY:number,origStart:number,origEnd:number,moved:boolean}

export function DayView({openSchedule}:{openSchedule:(seed:ScheduleSeed)=>void}){
  const {state,mutate}=usePlanner()
  const date=state.selectedDate
  const plan=state.dayPlans[date]??blankDay()
  const drag=useRef<Drag|null>(null)
  const canvas=useRef<HTMLDivElement>(null)
  const timed=useMemo(()=>state.events.filter(e=>e.date===date&&!e.allDay&&e.start).sort((a,b)=>a.start.localeCompare(b.start)),[state.events,date])
  const allDay=useMemo(()=>state.events.filter(e=>e.date===date&&e.allDay),[state.events,date])
  function patch(fn:(p:typeof plan)=>void,action='Day updated'){mutate(action,date,d=>{const p=d.dayPlans[date]??blankDay();d.dayPlans[date]=p;fn(p)})}
  function startDrag(e:ReactPointerEvent,ev:PlanEvent,kind:Drag['kind']){if(!ev.start||!ev.end)return;e.stopPropagation();drag.current={id:ev.id,kind,startY:e.clientY,origStart:minutes(ev.start),origEnd:minutes(ev.end),moved:false};e.currentTarget.setPointerCapture(e.pointerId)}
  function moveDrag(e:ReactPointerEvent){const g=drag.current;if(!g)return;const dy=e.clientY-g.startY;if(Math.abs(dy)>4)g.moved=true;const steps=Math.round(dy/ROW);const snapped=steps*ROW;const el=(e.currentTarget as HTMLElement).closest('.day-event') as HTMLElement|null;if(!el)return;if(g.kind==='move')el.style.transform=`translateY(${snapped}px)`;else if(g.kind==='top'){el.style.transform=`translateY(${snapped}px)`;el.style.height=`${Math.max(ROW,(g.origEnd-g.origStart)/STEP*ROW-snapped)}px`}else el.style.height=`${Math.max(ROW,(g.origEnd-g.origStart)/STEP*ROW+snapped)}px`}
  function endDrag(e:ReactPointerEvent){const g=drag.current;drag.current=null;const el=(e.currentTarget as HTMLElement).closest('.day-event') as HTMLElement|null;if(el){el.style.transform='';el.style.height=''}if(!g)return;const ev=state.events.find(x=>x.id===g.id);if(!ev)return;if(!g.moved){openSchedule({eventId:ev.id,date:ev.date,time:ev.start,title:ev.title,type:ev.type,allDay:ev.allDay});return}const delta=Math.round((e.clientY-g.startY)/ROW)*STEP;let start=g.origStart,end=g.origEnd;if(g.kind==='move'){const dur=end-start;start=Math.max(START,Math.min(END-dur,start+delta));end=start+dur}else if(g.kind==='top'){start=Math.max(START,Math.min(end-STEP,start+delta))}else{end=Math.min(END,Math.max(start+STEP,end+delta))}mutate('Day schedule adjusted',`${toTime(start)} · ${ev.title}`,d=>{const item=d.events.find(x=>x.id===g.id);if(!item)return;item.moves.push({at:new Date().toISOString(),from:`${item.start}-${item.end}`,to:`${toTime(start)}-${toTime(end)}`});item.start=toTime(start);item.end=toTime(end)})}
  return <div className="view-stack day-page-shell">
    <section className="view-title"><div><div className="eyebrow">Day / Execution</div><h1>{formatDay(date,{weekday:'long',month:'long',day:'numeric'})}</h1><p>Do what matters now. Drag scheduled blocks in 30-minute increments.</p></div></section>
    <div className="day-paper">
      <section className="day-schedule-side">
        <div className="paper-heading"><div><span>Schedule</span><strong>0400–2200</strong></div><button className="button small" onClick={()=>openSchedule({date,time:'09:00',type:'Task'})}><Icon name="plus"/>Add</button></div>
        <div className="all-day-row"><span>ALL DAY</span><div>{allDay.length?allDay.map(e=><button key={e.id} onClick={()=>openSchedule({eventId:e.id,date:e.date,title:e.title,type:e.type,allDay:true})}>{e.title}</button>):<em>Nothing unscheduled</em>}</div></div>
        <div className="day-timeline"><div className="day-time-axis">{Array.from({length:(END-START)/60+1},(_,i)=><div key={i} style={{top:i*ROW*2}}>{toTime(START+i*60)}</div>)}</div><div className="day-canvas" ref={canvas} style={{height:(END-START)/STEP*ROW}}>{Array.from({length:(END-START)/STEP},(_,i)=>{const time=toTime(START+i*STEP);return <button className="day-slot" key={time} style={{top:i*ROW,height:ROW}} onClick={()=>openSchedule({date,time,type:'Task'})} aria-label={`Add at ${time}`}></button>})}{timed.map(ev=>{const top=(minutes(ev.start)-START)/STEP*ROW;const h=Math.max(ROW,(minutes(ev.end)-minutes(ev.start))/STEP*ROW);return <div className={'day-event type-'+ev.type.toLowerCase().replaceAll(' ','-')+(ev.completed?' completed':'')} style={{top,height:h}} key={ev.id}><button className="resize-handle top" onPointerDown={e=>startDrag(e,ev,'top')} onPointerMove={moveDrag} onPointerUp={endDrag} aria-label="Adjust start"></button><button className="day-event-body" onPointerDown={e=>startDrag(e,ev,'move')} onPointerMove={moveDrag} onPointerUp={endDrag}><span>{ev.start}–{ev.end}</span><strong>{ev.title}</strong></button><button className="resize-handle bottom" onPointerDown={e=>startDrag(e,ev,'bottom')} onPointerMove={moveDrag} onPointerUp={endDrag} aria-label="Adjust end"></button></div>})}</div></div>
      </section>
      <section className="day-focus-side">
        <div className="paper-heading"><div><span>Main Focus</span><strong>Execute</strong></div></div>
        <label className="paper-focus"><textarea value={plan.focus} onChange={e=>patch(p=>{p.focus=e.target.value})} placeholder="What deserves your attention today?" rows={3}/></label>
        <div className="paper-section"><span className="paper-label">TOP 3</span>{plan.top3.map((v,i)=><div className="paper-task-line" key={i}><b>0{i+1}</b><input value={v} onChange={e=>patch(p=>{p.top3[i]=e.target.value})} placeholder={`Priority ${i+1}`}/></div>)}</div>
        <div className="paper-section"><span className="paper-label">OTHER TASKS</span>{plan.other.map((v,i)=><div className="paper-task-line" key={i}><button className="mini-check" onClick={()=>patch(p=>{p.other.splice(i,1)},'Day task completed')}><Icon name="check"/></button><input value={v} onChange={e=>patch(p=>{p.other[i]=e.target.value})}/></div>)}<button className="paper-add" onClick={()=>patch(p=>{p.other.push('')},'Day task added')}><Icon name="plus"/>Add task</button></div>
        <div className="paper-aar"><span className="paper-label">DAILY AAR</span><label>Worked<textarea rows={3} value={plan.worked} onChange={e=>patch(p=>{p.worked=e.target.value})}/></label><label>Friction<textarea rows={3} value={plan.friction} onChange={e=>patch(p=>{p.friction=e.target.value})}/></label><label>Carry forward<textarea rows={3} value={plan.carry} onChange={e=>patch(p=>{p.carry=e.target.value})}/></label></div>
      </section>
    </div>
  </div>
}
