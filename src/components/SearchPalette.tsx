import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { usePlanner } from '../state/PlannerContext'
import type { AppView } from '../types'

type SearchResult={title:string;meta:string;view:AppView;date?:string;boardId?:string}

function quarterDate(key:string){
  const match=key.match(/^(\d{4})-Q([1-4])$/)
  if(!match)return undefined
  const month=(Number(match[2])-1)*3+1
  return `${match[1]}-${String(month).padStart(2,'0')}-01`
}

export function SearchPalette({open,onClose,navigate}:{open:boolean;onClose:()=>void;navigate:(v:AppView)=>void}){
  const {state,mutate}=usePlanner()
  const [q,setQ]=useState('')
  useEffect(()=>{if(open)setQ('')},[open])

  const results=useMemo(()=>{
    const term=q.trim().toLowerCase()
    if(!term)return[]
    const out:SearchResult[]=[]
    const add=(r:SearchResult,haystack:string)=>{if(haystack.toLowerCase().includes(term))out.push(r)}

    state.events.forEach(e=>add({title:e.title,meta:`${e.type} · ${e.date} ${e.start||'All day'}`,view:'day',date:e.date},`${e.title} ${e.context} ${e.domain} ${e.type}`))
    state.todos.forEach(t=>add({title:t.title,meta:`Task${t.due?` · due ${t.due}`:''}`,view:'tasks'},`${t.title} ${t.notes} ${t.domain}`))
    state.inbox.forEach(i=>add({title:i.title,meta:`Inbox · ${i.status}`,view:'home'},`${i.title} ${i.notes} ${i.domain} ${i.status}`))

    Object.entries(state.quarterPlans).forEach(([key,p])=>{
      const date=quarterDate(key)
      add({title:p.mission||'Quarter mission',meta:`Quarter mission · ${key}`,view:'quarter',date},`${p.mission} ${p.risks} ${p.resources}`)
      if(p.aar)add({title:'Quarter AAR',meta:`Quarter review · ${key}`,view:'quarter',date},p.aar)
      p.goals.forEach(g=>{
        add({title:g.title||'Quarter goal',meta:`Quarter goal · ${key}`,view:'quarter',date},`${g.title} ${g.doneWhen} ${g.dependency} ${g.status}`)
        g.actions.forEach(a=>add({title:a.title||'Goal action',meta:`Goal action · ${key}`,view:'quarter',date:a.dueDate||date},a.title))
      })
      p.milestones.forEach(m=>add({title:m.title,meta:`${m.type} · ${m.date}`,view:'quarter',date:m.date},`${m.title} ${m.type}`))
    })

    Object.entries(state.monthPlans).forEach(([key,p])=>{
      const date=`${key}-01`
      add({title:p.mission||'Monthly mission',meta:`Month · ${key}`,view:'month',date},`${p.mission} ${p.metric} ${p.parking}`)
      p.goals.forEach(g=>add({title:g.title||'Monthly outcome',meta:`Monthly outcome · ${key}`,view:'month',date},`${g.title} ${g.doneWhen} ${g.dependency}`))
      if(p.aar)add({title:'Monthly AAR',meta:`Month review · ${key}`,view:'month',date},p.aar)
    })

    Object.entries(state.weekPlans).forEach(([key,p])=>{
      const hay=[p.mission,p.main,...p.top3,p.supports,p.constraints,p.decision,p.endState,p.wins,p.friction,p.lessons,p.nextMain].join(' ')
      add({title:p.main||p.mission||'Weekly mission',meta:`Week of ${key}`,view:'week',date:key},hay)
      p.tray.forEach(t=>add({title:t.title,meta:`This Week · unscheduled · ${key}`,view:'week',date:key},`${t.title} ${t.domain}`))
      if([p.wins,p.friction,p.lessons,p.nextMain].some(Boolean))add({title:'Weekly AAR',meta:`Week review · ${key}`,view:'week',date:key},`${p.wins} ${p.friction} ${p.lessons} ${p.nextMain}`)
    })

    Object.entries(state.dayPlans).forEach(([date,p])=>{
      const hay=[p.focus,...p.top3,...p.other,p.worked,p.friction,p.carry].join(' ')
      add({title:p.focus||'Daily plan',meta:`Day · ${date}`,view:'day',date},hay)
      if([p.worked,p.friction,p.carry].some(Boolean))add({title:'Daily AAR',meta:`Day review · ${date}`,view:'day',date},`${p.worked} ${p.friction} ${p.carry}`)
    })

    state.whiteboards.forEach(b=>b.nodes.forEach(n=>add({title:n.title||n.text||'Whiteboard item',meta:`Whiteboard · ${b.name}`,view:'board',boardId:b.id},`${n.title} ${n.text}`)))
    state.routines.forEach(r=>add({title:r.name,meta:`Recurring SOP · ${r.cadence}`,view:'home'},`${r.name} ${r.domain} ${r.items.map(i=>i.title).join(' ')}`))

    return out.slice(0,40)
  },[q,state])

  if(!open)return null
  return <div className="palette-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="search-palette"><header><div><div className="eyebrow">Planner Memory</div><h2>Search SOP</h2></div><button className="icon-button" onClick={onClose} aria-label="Close search"><Icon name="x"/></button></header><div className="search-input"><Icon name="search"/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search goals, tasks, milestones, notes, AARs…"/></div><div className="search-results">{q&&!results.length?<div className="empty-state">No matching planner records.</div>:results.map((r,i)=><button key={`${r.title}-${i}`} onClick={()=>{if(r.date||r.boardId)mutate('Search result opened',r.title,d=>{if(r.date)d.selectedDate=r.date;if(r.boardId)d.activeWhiteboardId=r.boardId});navigate(r.view);onClose()}}><strong>{r.title}</strong><small>{r.meta}</small></button>)}</div></section></div>
}
