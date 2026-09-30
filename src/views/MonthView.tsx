import { useState } from 'react'
import { Icon } from '../components/Icon'
import { usePlanner } from '../state/PlannerContext'
import { blankMonth } from '../state/defaults'
import { addDays, formatDay, fromKey, isoWeek, monthKey, startOfWeek } from '../utils/date'
import type { AppView } from '../types'

export function MonthView({ navigate }: { navigate: (view: AppView) => void }) {
  const { state, mutate } = usePlanner()
  const [tab,setTab]=useState<'calendar'|'aar'>('calendar')
  const key = monthKey(state.selectedDate)
  const plan = state.monthPlans[key] ?? blankMonth(`MG-${key}`)
  const first = `${key}-01`
  const start = startOfWeek(first)
  const cells = Array.from({length:42},(_,i)=>addDays(start,i))

  function patch(fn:(p:typeof plan)=>void, action='Month updated', allowClosed=false) {
    if(plan.closed&&!allowClosed)return
    mutate(action,key,d=>{ const p=d.monthPlans[key] ?? blankMonth(`MG-${key}`); d.monthPlans[key]=p; fn(p) })
  }
  function selectDay(date:string){ mutate('Date selected',date,d=>{d.selectedDate=date}); navigate('day') }
  function selectWeek(date:string){ mutate('Week selected',date,d=>{d.selectedDate=date}); navigate('week') }
  function toggleClosed(){patch(p=>{p.closed=!p.closed},plan.closed?'Month reopened':'Month closed',true)}

  return <div className="view-stack">
    <section className="view-title"><div><div className="eyebrow">Month</div><h1>{formatDay(first,{month:'long',year:'numeric'})}</h1><p>What must move this month?</p></div><div className="title-actions"><div className="segmented"><button className={tab==='calendar'?'active':''} onClick={()=>setTab('calendar')}><Icon name="calendar"/>Calendar</button><button className={tab==='aar'?'active':''} onClick={()=>setTab('aar')}><Icon name="history"/>AAR</button></div><button className="button" onClick={toggleClosed}>{plan.closed?'Reopen':'Close Month'}</button></div></section>
    {plan.closed&&<div className="closed-banner"><strong>MONTH CLOSED</strong><span>This month is preserved as a historical record. Reopen it to make changes.</span></div>}
    <section className="month-focus panel">
      <label><span>Monthly mission</span><input disabled={plan.closed} value={plan.mission} onChange={e=>patch(p=>{p.mission=e.target.value})} placeholder="What must be true by month end?" /></label>
      <div className="month-outcomes">{plan.goals.map((g,i)=><label key={g.id}><span>Outcome {i+1}</span><input disabled={plan.closed} value={g.title} onChange={e=>patch(p=>{p.goals[i].title=e.target.value})} placeholder="Measurable outcome" /></label>)}</div>
    </section>
    {tab==='calendar'?<section className="month-calendar panel">
      <div className="month-weekday-row"><div>WK</div>{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(x=><div key={x}>{x}</div>)}</div>
      {Array.from({length:6},(_,weekIndex)=>{
        const row=cells.slice(weekIndex*7,weekIndex*7+7)
        return <div className="month-week-row" key={weekIndex}><button className="week-number" onClick={()=>selectWeek(row[0])}>W{isoWeek(row[0])}</button>{row.map(date=>{const inMonth=monthKey(date)===key;const events=state.events.filter(e=>e.date===date).slice(0,3);return <button className={`month-day ${inMonth?'':'outside'} ${date===state.selectedDate?'selected':''}`} key={date} onClick={()=>selectDay(date)}><span className="date-num">{fromKey(date).getDate()}</span>{events.map(e=><span className={`month-event type-${e.type.toLowerCase().replaceAll(' ','-')}`} key={e.id}>{e.title}</span>)}</button>})}</div>
      })}
    </section>:<section className="panel month-aar">
      <div className="two-col">
        <label>Measure of movement<textarea disabled={plan.closed} rows={6} value={plan.metric} onChange={e=>patch(p=>{p.metric=e.target.value})} placeholder="What evidence shows progress this month?"/></label>
        <label>Parking lot / not now<textarea disabled={plan.closed} rows={6} value={plan.parking} onChange={e=>patch(p=>{p.parking=e.target.value})} placeholder="What did you consciously defer?"/></label>
      </div>
      <label>Monthly AAR<textarea disabled={plan.closed} rows={10} value={plan.aar} onChange={e=>patch(p=>{p.aar=e.target.value})} placeholder="What moved, what stalled, what did you learn, and what changes next month?"/></label>
    </section>}
  </div>
}
