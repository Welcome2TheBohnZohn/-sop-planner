import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '../components/Icon'
import { QuickAdd } from '../components/QuickAdd'
import { usePlanner } from '../state/PlannerContext'
import { blankWeek } from '../state/defaults'
import type { PlanEvent, ScheduleSeed } from '../types'
import { addDays, formatDay, minutes, startOfWeek, toTime } from '../utils/date'

const START_MIN=6*60, END_MIN=22*60, STEP=30, ROW_H=28

type DragState={id:string,startX:number,startY:number,origDate:string,origStart:number,duration:number,moved:boolean}

export function WeekView({ openSchedule }: { openSchedule: (seed: ScheduleSeed) => void }) {
  const { state, mutate, nextId } = usePlanner()
  const [tab,setTab]=useState<'mission'|'schedule'|'aar'>('schedule')
  const weekKey=startOfWeek(state.selectedDate)
  const plan=state.weekPlans[weekKey]??blankWeek()
  const days=Array.from({length:7},(_,i)=>addDays(weekKey,i))
  const canvasRef=useRef<HTMLDivElement>(null)
  const drag=useRef<DragState|null>(null)
  const events=useMemo(()=>state.events.filter(e=>e.date>=days[0]&&e.date<=days[6]&&!e.allDay&&e.start),[state.events,days])

  function patch(fn:(p:typeof plan)=>void,action='Week updated',detail=weekKey){mutate(action,detail,d=>{const p=d.weekPlans[weekKey]??blankWeek();d.weekPlans[weekKey]=p;fn(p)})}
  function addTray(title:string){patch(p=>p.tray.push({id:nextId('W'),title,estimateMin:30,domain:'',inboxId:null}),'Weekly task added',title)}
  function updateTop3(i:number,value:string){patch(p=>{p.top3[i]=value})}
  function pointerDown(e:ReactPointerEvent,ev:PlanEvent){if(ev.allDay||!ev.start||!ev.end)return;drag.current={id:ev.id,startX:e.clientX,startY:e.clientY,origDate:ev.date,origStart:minutes(ev.start),duration:Math.max(STEP,minutes(ev.end)-minutes(ev.start)),moved:false};e.currentTarget.setPointerCapture(e.pointerId)}
  function pointerMove(e:ReactPointerEvent){const g=drag.current,rect=canvasRef.current?.getBoundingClientRect();if(!g||!rect)return;const dx=e.clientX-g.startX,dy=e.clientY-g.startY;if(Math.abs(dx)>4||Math.abs(dy)>4)g.moved=true;(e.currentTarget as HTMLElement).style.transform=`translate(${Math.round(dx)}px,${Math.round(dy/ROW_H)*ROW_H}px)`}
  function pointerUp(e:ReactPointerEvent){const g=drag.current,rect=canvasRef.current?.getBoundingClientRect();drag.current=null;(e.currentTarget as HTMLElement).style.transform='';if(!g||!rect)return;if(!g.moved){const ev=state.events.find(x=>x.id===g.id);if(ev)openSchedule({date:ev.date,time:ev.start,title:ev.title,type:ev.type});return}const x=Math.max(0,Math.min(rect.width-1,e.clientX-rect.left));const y=Math.max(0,Math.min((END_MIN-START_MIN)/STEP*ROW_H-1,e.clientY-rect.top));const dayIndex=Math.max(0,Math.min(6,Math.floor(x/(rect.width/7))));const snapped=START_MIN+Math.round(y/ROW_H)*STEP;const start=Math.max(START_MIN,Math.min(END_MIN-g.duration,snapped));const date=days[dayIndex];mutate('Schedule adjusted',`${date} ${toTime(start)}`,d=>{const ev=d.events.find(x=>x.id===g.id);if(!ev)return;ev.moves.push({at:new Date().toISOString(),from:`${ev.date} ${ev.start}`,to:`${date} ${toTime(start)}`});ev.date=date;ev.start=toTime(start);ev.end=toTime(start+g.duration)})}

  const fixedMinutes=events.reduce((sum,e)=>sum+Math.max(0,minutes(e.end)-minutes(e.start)),0)
  const trayMinutes=plan.tray.reduce((sum,t)=>sum+t.estimateMin,0)
  const load=((fixedMinutes+trayMinutes)/(plan.availableHours*60))*100

  return <div className="view-stack">
    <section className="view-title"><div><div className="eyebrow">Week of {formatDay(weekKey,{month:'short',day:'numeric'})}</div><h1>{plan.main||'Weekly Mission'}</h1><p>What matters this week, and when will you do it?</p></div><div className="segmented"><button className={tab==='mission'?'active':''} onClick={()=>setTab('mission')}><Icon name="target"/>Mission</button><button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}><Icon name="calendar"/>Schedule</button><button className={tab==='aar'?'active':''} onClick={()=>setTab('aar')}><Icon name="history"/>AAR</button></div></section>
    {tab==='mission'&&<div className="two-col week-mission-layout"><section className="panel form-stack"><label>Main effort<input value={plan.main} onChange={e=>patch(p=>{p.main=e.target.value})} placeholder="If only one thing moves, what is it?"/></label><label>Weekly mission<textarea rows={3} value={plan.mission} onChange={e=>patch(p=>{p.mission=e.target.value})}/></label><div className="top3-editor"><span className="eyebrow">Top 3</span>{plan.top3.map((v,i)=><input key={i} value={v} onChange={e=>updateTop3(i,e.target.value)} placeholder={`Priority ${i+1}`}/>)}</div><label>Supporting efforts<textarea rows={3} value={plan.supports} onChange={e=>patch(p=>{p.supports=e.target.value})}/></label></section><section className="panel form-stack"><label>Constraints / risks<textarea rows={4} value={plan.constraints} onChange={e=>patch(p=>{p.constraints=e.target.value})}/></label><label>Decision point<textarea rows={3} value={plan.decision} onChange={e=>patch(p=>{p.decision=e.target.value})}/></label><label>Desired end state<textarea rows={4} value={plan.endState} onChange={e=>patch(p=>{p.endState=e.target.value})}/></label></section></div>}
    {tab==='schedule'&&<>
      <section className="capacity-strip panel"><div><span className="eyebrow">Capacity</span><strong>{Math.round((fixedMinutes+trayMinutes)/60*10)/10}h planned / {plan.availableHours}h available</strong></div><div className="capacity-track"><span style={{width:`${Math.min(100,load)}%`}} className={load>100?'over':load>85?'tight':''}></span></div><span className="capacity-label">{load>100?'Over capacity':load>85?'Tight':'Healthy buffer'}</span></section>
      <div className="week-schedule-layout"><aside className="panel week-tray"><div className="section-head compact"><div><div className="eyebrow">This Week</div><h2>Unscheduled</h2></div><span className="count-badge">{plan.tray.length}</span></div><QuickAdd placeholder="Add a weekly task…" buttonLabel="Add" onAdd={addTray}/>{plan.tray.map(t=><div className="tray-task" key={t.id}><div><strong>{t.title}</strong><small>{t.estimateMin} min</small></div><button className="icon-button subtle" onClick={()=>openSchedule({date:weekKey,time:'09:00',title:t.title,type:'Task',source:{kind:'tray',id:t.id,weekKey}})} aria-label="Schedule"><Icon name="calendar"/></button></div>)}</aside>
        <section className="panel week-calendar-shell"><div className="week-day-head"><div className="time-head"></div>{days.map(d=><button key={d} className={d===state.selectedDate?'current':''} onClick={()=>mutate('Date selected',d,x=>{x.selectedDate=d})}><strong>{formatDay(d,{weekday:'short'}).toUpperCase()}</strong><span>{formatDay(d,{month:'short',day:'numeric'})}</span></button>)}</div><div className="week-timeline-wrap"><div className="time-axis">{Array.from({length:(END_MIN-START_MIN)/60},(_,i)=><div style={{height:ROW_H*2}} key={i}>{toTime(START_MIN+i*60)}</div>)}</div><div className="week-canvas" ref={canvasRef} style={{height:(END_MIN-START_MIN)/STEP*ROW_H}}>{Array.from({length:7*((END_MIN-START_MIN)/STEP)},(_,i)=>{const day=Math.floor(i/((END_MIN-START_MIN)/STEP)),slot=i%((END_MIN-START_MIN)/STEP),date=days[day],time=toTime(START_MIN+slot*STEP);return <button key={i} className="week-slot" style={{left:`${day/7*100}%`,top:slot*ROW_H,width:`${100/7}%`,height:ROW_H}} onClick={()=>openSchedule({date,time,type:'Task'})} aria-label={`Add ${date} ${time}`}></button>})}{events.map(ev=>{const dayIndex=days.indexOf(ev.date);const top=(minutes(ev.start)-START_MIN)/STEP*ROW_H;const height=Math.max(ROW_H-2,(minutes(ev.end)-minutes(ev.start))/STEP*ROW_H-2);return <button key={ev.id} className={`week-event type-${ev.type.toLowerCase().replaceAll(' ','-')}`} style={{left:`calc(${dayIndex/7*100}% + 3px)`,width:`calc(${100/7}% - 6px)`,top,height}} onPointerDown={e=>pointerDown(e,ev)} onPointerMove={pointerMove} onPointerUp={pointerUp}><span>{ev.start}</span><strong>{ev.title}</strong></button>})}</div></div></section>
      </div>
    </>}
    {tab==='aar'&&<section className="panel aar-grid"><label>Wins<textarea rows={6} value={plan.wins} onChange={e=>patch(p=>{p.wins=e.target.value})}/></label><label>Friction<textarea rows={6} value={plan.friction} onChange={e=>patch(p=>{p.friction=e.target.value})}/></label><label>Lessons<textarea rows={6} value={plan.lessons} onChange={e=>patch(p=>{p.lessons=e.target.value})}/></label><label>Next week main effort<textarea rows={6} value={plan.nextMain} onChange={e=>patch(p=>{p.nextMain=e.target.value})}/></label></section>}
  </div>
}
