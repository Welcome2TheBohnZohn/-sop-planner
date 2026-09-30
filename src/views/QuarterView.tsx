import { useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { usePlanner } from '../state/PlannerContext'
import { blankQuarter } from '../state/defaults'
import type { Goal, QuarterMilestone } from '../types'
import { addDays, formatDay, fromKey, quarterKey, quarterWeeks, startOfWeek } from '../utils/date'

const STATUSES: Goal['status'][] = ['Not Started','On Track','At Risk','Blocked','Complete']

export function QuarterView() {
  const { state, mutate, nextId } = usePlanner()
  const [tab,setTab] = useState<'map'|'plan'|'aar'>('map')
  const [editingGoal,setEditingGoal] = useState<Goal | null>(null)
  const [goalIndex,setGoalIndex] = useState(-1)
  const [milestoneDraft,setMilestoneDraft] = useState<QuarterMilestone | null>(null)
  const key = quarterKey(state.selectedDate)
  const plan = state.quarterPlans[key] ?? blankQuarter(`QG-${key}`)
  const weeks = quarterWeeks(state.selectedDate)
  const weekStart = startOfWeek(weeks[0])

  function patch(fn:(p:typeof plan)=>void, action='Quarter updated', detail=key, allowClosed=false){
    if(plan.closed&&!allowClosed)return
    mutate(action,detail,d=>{const p=d.quarterPlans[key] ?? blankQuarter(`QG-${key}`);d.quarterPlans[key]=p;fn(p)})
  }
  function toggleClosed(){
    patch(p=>{p.closed=!p.closed},plan.closed?'Quarter reopened':'Quarter closed',key,true)
  }
  function editGoal(i:number){if(plan.closed)return;setGoalIndex(i);setEditingGoal(structuredClone(plan.goals[i]))}
  function saveGoal(){if(!editingGoal||goalIndex<0)return;patch(p=>{p.goals[goalIndex]=editingGoal},'Quarter goal saved',editingGoal.title);setEditingGoal(null)}
  function addAction(){if(!editingGoal)return;setEditingGoal({...editingGoal,actions:[...editingGoal.actions,{id:nextId('QA'),title:'',dueDate:'',done:false}]})}
  function openMilestone(goal:Goal,date:string){if(plan.closed)return;setMilestoneDraft({id:nextId('QM'),goalId:goal.id,title:'',date,type:'Milestone'})}
  function saveMilestone(){
    if(!milestoneDraft?.title.trim())return
    patch(p=>{
      const i=p.milestones.findIndex(m=>m.id===milestoneDraft.id)
      if(i>=0)p.milestones[i]=milestoneDraft
      else p.milestones.push(milestoneDraft)
    },'Quarter milestone saved',milestoneDraft.title)
    setMilestoneDraft(null)
  }
  function goalSpan(g:Goal){
    const start = g.startDate || weeks[0]
    const end = g.endDate || g.targetDate || addDays(weeks[0],84)
    const startIdx = Math.max(0, Math.min(12, Math.floor((fromKey(start).getTime()-fromKey(weekStart).getTime())/604800000)))
    const endIdx = Math.max(startIdx, Math.min(12, Math.floor((fromKey(end).getTime()-fromKey(weekStart).getTime())/604800000)))
    return {left:`${startIdx/13*100}%`,width:`${(endIdx-startIdx+1)/13*100}%`}
  }
  const quarterLabel = useMemo(()=>key.replace('-',' · '),[key])
  return <div className="view-stack">
    <section className="view-title quarter-heading"><div><div className="eyebrow">Quarter · Strategic Map</div><h1>{quarterLabel}</h1><p>Where are we going, and what proves progress?</p></div><div className="title-actions"><div className="segmented"><button className={tab==='map'?'active':''} onClick={()=>setTab('map')}><Icon name="target"/>Map</button><button className={tab==='plan'?'active':''} onClick={()=>setTab('plan')}><Icon name="tasks"/>Plan</button><button className={tab==='aar'?'active':''} onClick={()=>setTab('aar')}><Icon name="history"/>AAR</button></div><button className="button" onClick={toggleClosed}>{plan.closed?'Reopen':'Close Quarter'}</button></div></section>{plan.closed&&<div className="closed-banner"><strong>QUARTER CLOSED</strong><span>This period is preserved as a historical record. Reopen it to make changes.</span></div>}
    <section className="panel mission-strip"><label><span>Quarter mission</span><input disabled={plan.closed} value={plan.mission} onChange={e=>patch(p=>{p.mission=e.target.value})} placeholder="What needs to be true at the end of this quarter?"/></label></section>
    {tab==='map' && <section className="panel quarter-map-panel">
      <div className="quarter-weeks-head"><div className="goal-label-col">PRIMARY GOALS</div><div className="quarter-week-grid">{weeks.map((w,i)=><div key={w}><strong>W{i+1}</strong><small>{formatDay(w,{month:'short',day:'numeric'})}</small></div>)}</div></div>
      {plan.goals.map((g,gi)=><div className="quarter-lane-row" key={g.id}>
        <button className="goal-label-card" onClick={()=>editGoal(gi)}><span>{String(gi+1).padStart(2,'0')}</span><div><strong>{g.title||`Primary Goal ${gi+1}`}</strong><small>{g.status}</small></div><Icon name="edit"/></button>
        <div className="quarter-lane">
          {weeks.map((w,wi)=><button className="quarter-week-hit" aria-label={`Add milestone week ${wi+1}`} onClick={()=>openMilestone(g,w)} key={w}></button>)}
          <button className="goal-bar" style={goalSpan(g)} onClick={e=>{e.stopPropagation();editGoal(gi)}}><span>{g.title||'Define goal'}</span></button>
          {plan.milestones.filter(m=>m.goalId===g.id).map(m=>{const idx=Math.max(0,Math.min(12,weeks.findIndex(w=>m.date>=w&&m.date<addDays(w,7))));return <button className={`milestone-marker type-${m.type.toLowerCase().replaceAll(' ','-')}`} style={{left:`${(idx+.5)/13*100}%`}} key={m.id} title={`${m.type}: ${m.title}`} onClick={()=>setMilestoneDraft(structuredClone(m))}><span>{m.type==='Deadline'?'▲':m.type==='Decision Point'?'◇':'◆'}</span><em>{m.title}</em></button>})}
        </div>
      </div>)}
      <div className="map-legend"><span>◆ Milestone</span><span>◇ Decision Point</span><span>▲ Deadline</span><span>Click any week lane to add</span></div>
    </section>}
    {tab==='plan' && <div className="goal-plan-grid">{plan.goals.map((g,i)=><button className="goal-plan-card" key={g.id} onClick={()=>editGoal(i)}><div className="goal-card-top"><span className="goal-number">0{i+1}</span><span className={`status-pill ${g.status.toLowerCase().replace(' ','-')}`}>{g.status}</span></div><h2>{g.title||`Primary Goal ${i+1}`}</h2><p>{g.doneWhen||'Define what done looks like.'}</p><div className="goal-card-meta"><span>{g.targetDate?`Target ${g.targetDate}`:'No target date'}</span><span>{g.actions.filter(a=>!a.done).length} open actions</span></div></button>)}</div>}
    {tab==='aar' && <section className="panel aar-panel"><div className="section-head"><div><div className="eyebrow">Quarter AAR</div><h2>What changed because of this quarter?</h2></div></div><textarea disabled={plan.closed} rows={12} value={plan.aar} onChange={e=>patch(p=>{p.aar=e.target.value})} placeholder="Outcomes, misses, lessons, decisions, what carries forward…"/></section>}

    <Modal open={!!editingGoal} title="Quarter goal" eyebrow={`Primary Goal ${goalIndex+1}`} onClose={()=>setEditingGoal(null)} footer={<><button className="button" onClick={()=>setEditingGoal(null)}>Cancel</button><button className="button primary" onClick={saveGoal}><Icon name="save"/>Save goal</button></>}>
      {editingGoal && <div className="form-stack">
        <label>Outcome<input value={editingGoal.title} onChange={e=>setEditingGoal({...editingGoal,title:e.target.value})} placeholder="What outcome are you driving?"/></label>
        <label>Definition of done<textarea rows={3} value={editingGoal.doneWhen} onChange={e=>setEditingGoal({...editingGoal,doneWhen:e.target.value})}/></label>
        <div className="form-grid three"><label>Status<select value={editingGoal.status} onChange={e=>setEditingGoal({...editingGoal,status:e.target.value as Goal['status']})}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label><label>Start<input type="date" value={editingGoal.startDate} onChange={e=>setEditingGoal({...editingGoal,startDate:e.target.value})}/></label><label>Target<input type="date" value={editingGoal.targetDate} onChange={e=>setEditingGoal({...editingGoal,targetDate:e.target.value,endDate:e.target.value})}/></label></div>
        <label>Dependency / blocker<input value={editingGoal.dependency} onChange={e=>setEditingGoal({...editingGoal,dependency:e.target.value})}/></label>
        <div className="action-editor"><div className="section-head compact"><div><div className="eyebrow">Actions</div><h3>What moves this goal?</h3></div><button className="button" type="button" onClick={addAction}><Icon name="plus"/>Action</button></div>{editingGoal.actions.map((a,i)=><div className="goal-action-row" key={a.id}><button className={`check-button ${a.done?'checked':''}`} onClick={()=>{const actions=[...editingGoal.actions];actions[i]={...actions[i],done:!actions[i].done};setEditingGoal({...editingGoal,actions})}}>{a.done&&<Icon name="check"/>}</button><input value={a.title} placeholder="Action" onChange={e=>{const actions=[...editingGoal.actions];actions[i]={...actions[i],title:e.target.value};setEditingGoal({...editingGoal,actions})}}/><input type="date" value={a.dueDate} onChange={e=>{const actions=[...editingGoal.actions];actions[i]={...actions[i],dueDate:e.target.value};setEditingGoal({...editingGoal,actions})}}/><button className="icon-button subtle" onClick={()=>setEditingGoal({...editingGoal,actions:editingGoal.actions.filter((_,x)=>x!==i)})}><Icon name="trash"/></button></div>)}</div>
      </div>}
    </Modal>
    <Modal open={!!milestoneDraft} title={milestoneDraft?.id && plan.milestones.some(m=>m.id===milestoneDraft.id)?'Edit milestone':'Add milestone'} eyebrow="Quarter map" onClose={()=>setMilestoneDraft(null)} footer={<><button className="button" onClick={()=>setMilestoneDraft(null)}>Cancel</button><button className="button primary" onClick={saveMilestone}><Icon name="target"/>Save to map</button></>}>
      {milestoneDraft && <div className="form-stack"><label>Milestone / checkpoint<input autoFocus value={milestoneDraft.title} onChange={e=>setMilestoneDraft({...milestoneDraft,title:e.target.value})}/></label><div className="form-grid"><label>Date<input type="date" value={milestoneDraft.date} onChange={e=>setMilestoneDraft({...milestoneDraft,date:e.target.value})}/></label><label>Type<select value={milestoneDraft.type} onChange={e=>setMilestoneDraft({...milestoneDraft,type:e.target.value as QuarterMilestone['type']})}><option>Milestone</option><option>Decision Point</option><option>Deadline</option></select></label></div></div>}
    </Modal>
  </div>
}
