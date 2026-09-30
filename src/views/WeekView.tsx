import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon } from '../components/Icon'
import { QuickAdd } from '../components/QuickAdd'
import { Modal } from '../components/Modal'
import { usePlanner } from '../state/PlannerContext'
import { blankWeek } from '../state/defaults'
import type { PlanEvent, ScheduleSeed, WeekPlan, WeekTask } from '../types'
import { addDays, formatDay, minutes, startOfWeek, toTime } from '../utils/date'

const START_MIN=6*60, END_MIN=22*60

type DragState={id:string;startX:number;startY:number;origDate:string;origStart:number;duration:number;moved:boolean}

export function WeekView({ openSchedule }: { openSchedule: (seed: ScheduleSeed) => void }) {
  const { state, mutate, nextId } = usePlanner()
  const [tab,setTab]=useState<'mission'|'schedule'|'aar'>('schedule')
  const [interval,setInterval]=useState<15|30>(30)
  const [editingTray,setEditingTray]=useState<WeekTask|null>(null)
  const weekKey=startOfWeek(state.selectedDate)
  const plan=state.weekPlans[weekKey]??blankWeek()
  const days=Array.from({length:7},(_,i)=>addDays(weekKey,i))
  const canvasRef=useRef<HTMLDivElement>(null)
  const drag=useRef<DragState|null>(null)
  const rowH=interval===30?28:18
  const slotsPerDay=(END_MIN-START_MIN)/interval
  const timedEvents=useMemo(()=>state.events.filter(e=>e.date>=days[0]&&e.date<=days[6]&&!e.allDay&&e.start),[state.events,weekKey])
  const allDayEvents=useMemo(()=>state.events.filter(e=>e.date>=days[0]&&e.date<=days[6]&&e.allDay),[state.events,weekKey])

  function patch(fn:(p:WeekPlan)=>void,action='Week updated',detail=weekKey,allowClosed=false){
    if(plan.closed&&!allowClosed)return
    mutate(action,detail,d=>{const p=d.weekPlans[weekKey]??blankWeek();d.weekPlans[weekKey]=p;fn(p)})
  }
  function addTray(title:string){patch(p=>p.tray.push({id:nextId('W'),title,estimateMin:30,domain:'',inboxId:null}),'Weekly task added',title)}
  function saveTrayTask(){
    if(!editingTray)return
    patch(p=>{const i=p.tray.findIndex(t=>t.id===editingTray.id);if(i>=0)p.tray[i]=editingTray},'Weekly task updated',editingTray.title)
    setEditingTray(null)
  }
  function deleteTrayTask(){
    if(!editingTray)return
    const item=editingTray
    patch(p=>{p.tray=p.tray.filter(t=>t.id!==item.id)},'Weekly task deleted',item.title)
    setEditingTray(null)
  }
  function updateTop3(i:number,value:string){patch(p=>{p.top3[i]=value})}
  function toggleClosed(){patch(p=>{p.closed=!p.closed},plan.closed?'Week reopened':'Week closed',weekKey,true)}
  function saveTemplate(){
    mutate('Week template saved',weekKey,d=>{d.weekTemplate={mission:plan.mission,main:plan.main,top3:[...plan.top3] as [string,string,string],supports:plan.supports,constraints:plan.constraints,decision:plan.decision,endState:plan.endState,availableHours:plan.availableHours,bufferPct:plan.bufferPct}})
  }
  function applyTemplate(){
    if(plan.closed||!state.weekTemplate)return
    mutate('Week template applied',weekKey,d=>{
      const current=d.weekPlans[weekKey]??blankWeek()
      const tray=current.tray
      const aar={wins:current.wins,friction:current.friction,lessons:current.lessons,nextMain:current.nextMain}
      d.weekPlans[weekKey]={...current,...structuredClone(d.weekTemplate),tray,...aar} as WeekPlan
    })
  }
  function buildNextWeek(){
    const nextDate=addDays(weekKey,7),nextKey=startOfWeek(nextDate)
    const currentEvents=state.events.filter(e=>e.date>=days[0]&&e.date<=days[6]&&e.type==='Task'&&!e.completed)
    mutate('Next week built from AAR',`${plan.tray.length+currentEvents.length} unfinished items reviewed`,d=>{
      const next=d.weekPlans[nextKey]??blankWeek();d.weekPlans[nextKey]=next
      if(plan.nextMain&&!next.main)next.main=plan.nextMain
      for(const t of plan.tray){
        if(!next.tray.some(x=>x.title===t.title))next.tray.push({...t,id:nextId('W')})
      }
      for(const e of currentEvents){
        const newDate=addDays(e.date,7)
        if(d.events.some(x=>x.date===newDate&&x.start===e.start&&x.title===e.title))continue
        const id=nextId('EV')
        d.events.push({...structuredClone(e),id,date:newDate,completed:false,original:{date:newDate,start:e.start,end:e.end,allDay:e.allDay},moves:[]})
      }
      d.selectedDate=nextDate
    })
    setTab('mission')
  }

  function pointerDown(e:ReactPointerEvent,ev:PlanEvent){
    if(plan.closed||ev.allDay||!ev.start||!ev.end)return
    drag.current={id:ev.id,startX:e.clientX,startY:e.clientY,origDate:ev.date,origStart:minutes(ev.start),duration:Math.max(interval,minutes(ev.end)-minutes(ev.start)),moved:false}
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function pointerMove(e:ReactPointerEvent){
    const g=drag.current,rect=canvasRef.current?.getBoundingClientRect();if(!g||!rect)return
    const dx=e.clientX-g.startX,dy=e.clientY-g.startY;if(Math.abs(dx)>4||Math.abs(dy)>4)g.moved=true
    ;(e.currentTarget as HTMLElement).style.transform=`translate(${Math.round(dx)}px,${Math.round(dy/rowH)*rowH}px)`
  }
  function pointerUp(e:ReactPointerEvent){
    const g=drag.current,rect=canvasRef.current?.getBoundingClientRect();drag.current=null;(e.currentTarget as HTMLElement).style.transform=''
    if(!g||!rect)return
    if(!g.moved){const ev=state.events.find(x=>x.id===g.id);if(ev)openSchedule({eventId:ev.id,date:ev.date,time:ev.start,title:ev.title,type:ev.type,allDay:ev.allDay});return}
    const x=Math.max(0,Math.min(rect.width-1,e.clientX-rect.left))
    const y=Math.max(0,Math.min(slotsPerDay*rowH-1,e.clientY-rect.top))
    const dayIndex=Math.max(0,Math.min(6,Math.floor(x/(rect.width/7))))
    const snapped=START_MIN+Math.round(y/rowH)*interval
    const start=Math.max(START_MIN,Math.min(END_MIN-g.duration,snapped)),date=days[dayIndex]
    mutate('Schedule adjusted',`${date} ${toTime(start)}`,d=>{const ev=d.events.find(x=>x.id===g.id);if(!ev)return;ev.moves.push({at:new Date().toISOString(),from:`${ev.date} ${ev.start}`,to:`${date} ${toTime(start)}`});ev.date=date;ev.start=toTime(start);ev.end=toTime(start+g.duration)})
  }

  const fixedMinutes=timedEvents.reduce((sum,e)=>sum+Math.max(0,minutes(e.end)-minutes(e.start)),0)
  const trayMinutes=plan.tray.reduce((sum,t)=>sum+t.estimateMin,0)
  const load=((fixedMinutes+trayMinutes)/(plan.availableHours*60))*100

  return <div className="view-stack">
    <section className="view-title"><div><div className="eyebrow">Week of {formatDay(weekKey,{month:'short',day:'numeric'})}</div><h1>{plan.main||'Weekly Mission'}</h1><p>What matters this week, and when will you do it?</p></div><div className="title-actions"><div className="segmented"><button className={tab==='mission'?'active':''} onClick={()=>setTab('mission')}><Icon name="target"/>Mission</button><button className={tab==='schedule'?'active':''} onClick={()=>setTab('schedule')}><Icon name="calendar"/>Schedule</button><button className={tab==='aar'?'active':''} onClick={()=>setTab('aar')}><Icon name="history"/>AAR</button></div><button className="button" onClick={toggleClosed}>{plan.closed?'Reopen':'Close Week'}</button></div></section>
    {plan.closed&&<div className="closed-banner"><strong>WEEK CLOSED</strong><span>This week is preserved as a historical record. Reopen it to make changes.</span></div>}

    {tab==='mission'&&<>
      <div className="week-template-bar"><span className="hint-line">Reusable planning structure</span><div className="row-actions"><button className="button" disabled={plan.closed} onClick={saveTemplate}><Icon name="save"/>Save template</button><button className="button" disabled={plan.closed||!state.weekTemplate} onClick={applyTemplate}><Icon name="template"/>Apply template</button></div></div>
      <div className="two-col week-mission-layout"><section className="panel form-stack"><label>Main effort<input disabled={plan.closed} value={plan.main} onChange={e=>patch(p=>{p.main=e.target.value})} placeholder="If only one thing moves, what is it?"/></label><label>Weekly mission<textarea disabled={plan.closed} rows={3} value={plan.mission} onChange={e=>patch(p=>{p.mission=e.target.value})}/></label><div className="top3-editor"><span className="eyebrow">Top 3</span>{plan.top3.map((v,i)=><input disabled={plan.closed} key={i} value={v} onChange={e=>updateTop3(i,e.target.value)} placeholder={`Priority ${i+1}`}/>)}</div><label>Supporting efforts<textarea disabled={plan.closed} rows={3} value={plan.supports} onChange={e=>patch(p=>{p.supports=e.target.value})}/></label></section><section className="panel form-stack"><label>Constraints / risks<textarea disabled={plan.closed} rows={4} value={plan.constraints} onChange={e=>patch(p=>{p.constraints=e.target.value})}/></label><label>Decision point<textarea disabled={plan.closed} rows={3} value={plan.decision} onChange={e=>patch(p=>{p.decision=e.target.value})}/></label><label>Desired end state<textarea disabled={plan.closed} rows={4} value={plan.endState} onChange={e=>patch(p=>{p.endState=e.target.value})}/></label></section></div>
    </>}

    {tab==='schedule'&&<>
      <section className="capacity-strip panel"><div><span className="eyebrow">Capacity</span><strong>{Math.round((fixedMinutes+trayMinutes)/60*10)/10}h planned / <input className="capacity-number" disabled={plan.closed} type="number" min="1" max="168" value={plan.availableHours} onChange={e=>patch(p=>{p.availableHours=Math.max(1,Number(e.target.value)||40)})}/>h available</strong></div><div className="capacity-track"><span style={{width:`${Math.min(100,load)}%`}} className={load>100?'over':load>85?'tight':''}></span></div><span className="capacity-label">{load>100?'Over capacity':load>85?'Tight':'Healthy buffer'}</span><div className="segmented interval-control"><button className={interval===30?'active':''} onClick={()=>setInterval(30)}>30 MIN</button><button className={interval===15?'active':''} onClick={()=>setInterval(15)}>15 MIN</button></div></section>
      <div className="week-schedule-layout"><aside className="panel week-tray"><div className="section-head compact"><div><div className="eyebrow">This Week</div><h2>Unscheduled</h2></div><span className="count-badge">{plan.tray.length}</span></div>{plan.closed?<div className="hint-line">Reopen this week to add or schedule work.</div>:<QuickAdd placeholder="Add a weekly task…" buttonLabel="Add" onAdd={addTray}/>} {plan.tray.map(t=><div className="tray-task" key={t.id}><button className="tray-task-copy" disabled={plan.closed} onClick={()=>setEditingTray(structuredClone(t))}><strong>{t.title}</strong><small>{t.estimateMin} min{t.domain?' · '+t.domain:''}</small></button><button disabled={plan.closed} className="icon-button subtle" onClick={()=>openSchedule({date:weekKey,time:'09:00',title:t.title,type:'Task',source:{kind:'tray',id:t.id,weekKey}})} aria-label="Schedule"><Icon name="calendar"/></button></div>)}</aside>
        <section className="panel week-calendar-shell">
          <div className="week-day-head"><div className="time-head"></div>{days.map(d=><button key={d} className={d===state.selectedDate?'current':''} onClick={()=>mutate('Date selected',d,x=>{x.selectedDate=d})}><strong>{formatDay(d,{weekday:'short'}).toUpperCase()}</strong><span>{formatDay(d,{month:'short',day:'numeric'})}</span></button>)}</div>
          <div className="week-all-day"><div className="all-day-label">ALL DAY</div>{days.map(d=><div className="week-all-day-cell" key={d}>{allDayEvents.filter(e=>e.date===d).map(e=><button key={e.id} onClick={()=>!plan.closed&&openSchedule({eventId:e.id,date:e.date,title:e.title,type:e.type,allDay:true})}>{e.title}</button>)}</div>)}</div>
          <div className="week-timeline-wrap"><div className="time-axis">{Array.from({length:(END_MIN-START_MIN)/60},(_,i)=><div style={{height:rowH*(60/interval)}} key={i}>{toTime(START_MIN+i*60)}</div>)}</div><div className="week-canvas" ref={canvasRef} style={{height:slotsPerDay*rowH,backgroundSize:`100% ${rowH}px, calc(100% / 7) 100%`}}>{Array.from({length:7*slotsPerDay},(_,i)=>{const day=Math.floor(i/slotsPerDay),slot=i%slotsPerDay,date=days[day],time=toTime(START_MIN+slot*interval);return <button disabled={plan.closed} key={i} className="week-slot" style={{left:`${day/7*100}%`,top:slot*rowH,width:`${100/7}%`,height:rowH}} onClick={()=>openSchedule({date,time,type:'Task'})} aria-label={`Add ${date} ${time}`}></button>})}{timedEvents.map(ev=>{const dayIndex=days.indexOf(ev.date);const top=(minutes(ev.start)-START_MIN)/interval*rowH;const height=Math.max(rowH-2,(minutes(ev.end)-minutes(ev.start))/interval*rowH-2);return <button key={ev.id} className={'week-event type-'+ev.type.toLowerCase().replaceAll(' ','-')+(ev.completed?' completed':'')} style={{left:`calc(${dayIndex/7*100}% + 3px)`,width:`calc(${100/7}% - 6px)`,top,height}} onPointerDown={e=>pointerDown(e,ev)} onPointerMove={pointerMove} onPointerUp={pointerUp}><span>{ev.start}</span><strong>{ev.title}</strong></button>})}</div></div>
        </section>
      </div>
    </>}

    <Modal open={!!editingTray} title="Edit weekly task" eyebrow="This Week / Unscheduled" onClose={()=>setEditingTray(null)} footer={<>{editingTray&&<button className="button danger" onClick={deleteTrayTask}><Icon name="trash"/>Delete</button>}<div className="spacer"/><button className="button" onClick={()=>setEditingTray(null)}>Cancel</button><button className="button primary" onClick={saveTrayTask}><Icon name="save"/>Save task</button></>}>
      {editingTray&&<div className="form-stack"><label>Task<input autoFocus value={editingTray.title} onChange={e=>setEditingTray({...editingTray,title:e.target.value})}/></label><div className="form-grid"><label>Estimate<select value={editingTray.estimateMin} onChange={e=>setEditingTray({...editingTray,estimateMin:Number(e.target.value)})}><option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>1 hour</option><option value={90}>1.5 hours</option><option value={120}>2 hours</option><option value={180}>3 hours</option></select></label><label>Domain<select value={editingTray.domain} onChange={e=>setEditingTray({...editingTray,domain:e.target.value})}><option value="">None</option>{Object.entries(state.settings.domains).filter(([,v])=>v).map(([d])=><option key={d}>{d}</option>)}</select></label></div></div>}
    </Modal>

    {tab==='aar'&&<><section className="panel aar-grid"><label>Wins<textarea disabled={plan.closed} rows={6} value={plan.wins} onChange={e=>patch(p=>{p.wins=e.target.value})}/></label><label>Friction<textarea disabled={plan.closed} rows={6} value={plan.friction} onChange={e=>patch(p=>{p.friction=e.target.value})}/></label><label>Lessons<textarea disabled={plan.closed} rows={6} value={plan.lessons} onChange={e=>patch(p=>{p.lessons=e.target.value})}/></label><label>Next week main effort<textarea disabled={plan.closed} rows={6} value={plan.nextMain} onChange={e=>patch(p=>{p.nextMain=e.target.value})}/></label></section><div className="aar-build-bar"><div><div className="eyebrow">Transition</div><strong>Turn this review into next week.</strong><p className="hint-line">Carries current unscheduled work and incomplete scheduled tasks forward once, then opens next week’s Mission view.</p></div><button className="button primary" onClick={buildNextWeek}><Icon name="right"/>Build next week</button></div></>}
  </div>
}
