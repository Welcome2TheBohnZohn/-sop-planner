import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { usePlanner } from '../state/PlannerContext'
import type { Routine } from '../types'
import { instantiateRoutineDraft } from '../utils/routines'

function emptyRoutine(id:string):Routine {
  return {id,name:'',cadence:'Weekly',destination:'inbox',domain:'',trigger:'1',items:[],active:true,createdAt:new Date().toISOString()}
}

export function RoutinesModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const {state,mutate,nextId}=usePlanner()
  const [editing,setEditing]=useState<Routine|null>(null)
  const [itemsText,setItemsText]=useState('')
  const domains=useMemo(()=>Object.entries(state.settings.domains).filter(([,v])=>v).map(([d])=>d),[state.settings.domains])
  function begin(r?:Routine){const draft=r?structuredClone(r):emptyRoutine(nextId('S'));setEditing(draft);setItemsText(draft.items.map(i=>`${i.title} | ${i.estimateMin}`).join('\n'))}
  function save(){
    if(!editing?.name.trim())return
    const parsed=itemsText.split('\n').map(x=>x.trim()).filter(Boolean).map((line,i)=>{const [title,estimate]=line.split('|');return{id:editing.items[i]?.id||nextId('SI'),title:title.trim(),estimateMin:Math.max(5,Number(estimate)||30)}})
    const draft={...editing,name:editing.name.trim(),items:parsed}
    mutate('Recurring SOP saved',draft.name,d=>{const i=d.routines.findIndex(r=>r.id===draft.id);if(i>=0)d.routines[i]=draft;else d.routines.push(draft)})
    setEditing(draft)
  }
  function runNow(r:Routine){mutate('Recurring SOP run',r.name,d=>{instantiateRoutineDraft(d,r,`MANUAL-${Date.now()}`,true)})}
  return <Modal open={open} title="Recurring SOPs" eyebrow="Reusable operating routines" onClose={onClose} footer={<button className="button primary" onClick={onClose}>Done</button>}>
    <div className="routines-layout">
      <section className="routine-list-pane">
        <div className="section-head compact"><div><div className="eyebrow">Library</div><h3>{state.routines.length} routines</h3></div><button className="button" onClick={()=>begin()}><Icon name="plus"/>New SOP</button></div>
        <div className="routine-list">{state.routines.length?state.routines.map(r=><button className={editing?.id===r.id?'active':''} key={r.id} onClick={()=>begin(r)}><strong>{r.name}</strong><small>{r.cadence} · {r.destination==='week'?'This Week':'Inbox'} · {r.items.length} steps</small></button>):<div className="empty-state">No recurring SOPs yet.</div>}</div>
      </section>
      <section className="routine-editor-pane">
        {!editing?<div className="empty-state">Choose a routine or create a new one.</div>:<div className="form-stack">
          <label>Name<input autoFocus value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} placeholder="Weekly Planning, Travel Prep, Month Close…"/></label>
          <div className="form-grid"><label>Cadence<select value={editing.cadence} onChange={e=>setEditing({...editing,cadence:e.target.value as Routine['cadence']})}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Manual</option></select></label><label>Destination<select value={editing.destination} onChange={e=>setEditing({...editing,destination:e.target.value as Routine['destination']})}><option value="inbox">Inbox</option><option value="week">This Week</option></select></label></div>
          <div className="form-grid"><label>Domain<select value={editing.domain} onChange={e=>setEditing({...editing,domain:e.target.value})}><option value="">None</option>{domains.map(d=><option key={d}>{d}</option>)}</select></label><label>Trigger {editing.cadence==='Weekly'?'(1=Mon … 7=Sun)':editing.cadence==='Monthly'?'(day of month)':' '}<input disabled={!['Weekly','Monthly'].includes(editing.cadence)} value={editing.trigger} onChange={e=>setEditing({...editing,trigger:e.target.value})}/></label></div>
          <label>Steps <span className="hint-line">One per line. Optional minutes after |</span><textarea rows={9} value={itemsText} onChange={e=>setItemsText(e.target.value)} placeholder={'Review calendar | 15\nChoose main effort | 15\nBlock focus time | 30'}/></label>
          <label className="checkbox-line"><input type="checkbox" checked={editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})}/><span>Active</span></label>
          <div className="routine-actions"><button className="button danger" onClick={()=>{mutate('Recurring SOP deleted',editing.name,d=>{d.routines=d.routines.filter(r=>r.id!==editing.id);delete d.routineRuns[editing.id]});setEditing(null)}}><Icon name="trash"/>Delete</button><div className="spacer"/><button className="button" onClick={()=>runNow(editing)}><Icon name="plus"/>Run now</button><button className="button primary" onClick={save}><Icon name="save"/>Save SOP</button></div>
        </div>}
      </section>
    </div>
  </Modal>
}
