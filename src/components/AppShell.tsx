import { useRef, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { Modal } from './Modal'
import { usePlanner } from '../state/PlannerContext'
import type { AppView, PlannerState, ScheduleSeed } from '../types'
import { addDays, dateKey, formatDay, fromKey, monthKey, quarterKey, startOfWeek, todayKey } from '../utils/date'

const NAV:Array<{view:AppView;label:string;icon:IconName}>=[
  {view:'home',label:'Home',icon:'home'},{view:'quarter',label:'Quarter',icon:'target'},{view:'month',label:'Month',icon:'calendar'},{view:'week',label:'Week',icon:'week'},{view:'day',label:'Day',icon:'day'},{view:'tasks',label:'Tasks',icon:'tasks'},{view:'board',label:'Whiteboard',icon:'board'}
]

export function AppShell({children,view,navigate,openInbox,openSearch,openSchedule,openRoutines}:{children:ReactNode;view:AppView;navigate:(v:AppView)=>void;openInbox:()=>void;openSearch:()=>void;openSchedule:(s:ScheduleSeed)=>void;openRoutines:()=>void}){
  const {state,mutate,replaceState,saveStatus,canUndo,undo}=usePlanner()
  const [menu,setMenu]=useState(false)
  const [historyOpen,setHistoryOpen]=useState(false)
  const [settingsOpen,setSettingsOpen]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)
  const inboxCount=state.inbox.filter(i=>i.status==='inbox').length
  const period=view==='quarter'?quarterKey(state.selectedDate):view==='month'?formatDay(`${monthKey(state.selectedDate)}-01`,{month:'long',year:'numeric'}):view==='week'?`Week of ${formatDay(startOfWeek(state.selectedDate),{month:'short',day:'numeric',year:'numeric'})}`:formatDay(state.selectedDate,{weekday:'short',month:'long',day:'numeric',year:'numeric'})

  function movePeriod(direction:number){
    let next=state.selectedDate
    if(view==='quarter'){const d=fromKey(next);d.setMonth(d.getMonth()+direction*3);next=dateKey(d)}
    else if(view==='month'){const d=fromKey(next);d.setMonth(d.getMonth()+direction);next=dateKey(d)}
    else if(view==='week')next=addDays(next,direction*7)
    else next=addDays(next,direction)
    mutate('Date selected',next,d=>{d.selectedDate=next})
  }
  function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`sop-planner-${todayKey()}.json`;a.click();URL.revokeObjectURL(url);setMenu(false)}
  function importData(file:File){const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(String(reader.result)) as PlannerState;if(parsed?.schemaVersion!==1)throw new Error('Unsupported file');replaceState(parsed);setMenu(false)}catch{alert('That file is not a valid SOP next-generation export.')}};reader.readAsText(file)}
  function toggleDomain(name:string){mutate('Domain setting changed',name,d=>{d.settings.domains[name]=!d.settings.domains[name]})}

  return <div className="app-shell">
    <header className="app-header">
      <div className="header-row primary-header-row">
        <button className="brand" onClick={()=>navigate('home')}><span className="brand-mark">SOP<span>›_</span></span><span className="brand-copy"><strong>Standard Operating Planner</strong><small>PLAN · EXECUTE · REVIEW · ADJUST</small></span></button>
        <nav className="primary-nav" aria-label="Primary views">{NAV.map(n=><button key={n.view} className={view===n.view?'active':''} onClick={()=>navigate(n.view)}><Icon name={n.icon}/><span>{n.label}</span></button>)}</nav>
        <div className="header-tools"><button className="icon-button" onClick={openSearch} aria-label="Search"><Icon name="search"/></button><button className="inbox-button" onClick={openInbox}><Icon name="inbox"/><span>Inbox</span><b>{inboxCount}</b></button><span className={`save-status ${saveStatus}`}>{saveStatus==='saving'?'Saving…':saveStatus==='error'?'Save error':'Saved'}</span><div className="popover-wrap"><button className="icon-button" onClick={()=>setMenu(v=>!v)} aria-label="More"><Icon name="more"/></button>{menu&&<div className="menu-popover"><button disabled={!canUndo} onClick={()=>{undo();setMenu(false)}}><Icon name="undo"/>Undo last change</button><button onClick={()=>{setHistoryOpen(true);setMenu(false)}}><Icon name="history"/>History</button><button onClick={()=>{openRoutines();setMenu(false)}}><Icon name="repeat"/>Recurring SOPs</button><button onClick={()=>{setSettingsOpen(true);setMenu(false)}}><Icon name="settings"/>Settings</button><button onClick={exportData}><Icon name="export"/>Export data</button><button onClick={()=>fileRef.current?.click()}><Icon name="import"/>Import data</button></div>}</div><input ref={fileRef} type="file" accept="application/json" hidden onChange={e=>{const file=e.target.files?.[0];if(file)importData(file);e.currentTarget.value=''}}/><button className="button primary global-add" onClick={()=>openSchedule({date:state.selectedDate,time:'09:00',type:'Task'})}><Icon name="plus"/><span>Add</span></button></div>
      </div>
      <div className="header-row period-row"><div className="date-stepper"><button className="icon-button subtle" onClick={()=>movePeriod(-1)} aria-label="Previous"><Icon name="left"/></button><button className="today-control" onClick={()=>mutate('Today selected',todayKey(),d=>{d.selectedDate=todayKey()})}>Today</button><button className="icon-button subtle" onClick={()=>movePeriod(1)} aria-label="Next"><Icon name="right"/></button></div><strong className="period-label">{period}</strong><div className="context-ribbon"><button onClick={()=>navigate('quarter')}>QUARTER</button><span>›</span><button onClick={()=>navigate('month')}>MONTH</button><span>›</span><button onClick={()=>navigate('week')}>WEEK</button><span>›</span><button onClick={()=>{const t=todayKey();mutate('Today selected',t,d=>{d.selectedDate=t});navigate('day')}}>TODAY</button></div></div>
    </header>
    <main className={`app-main view-${view}`}>{children}</main>

    <Modal open={historyOpen} title="Activity history" eyebrow="Planner memory" onClose={()=>setHistoryOpen(false)}><div className="history-list">{state.history.length?state.history.map(h=><div key={h.id}><span>{new Date(h.at).toLocaleString()}</span><strong>{h.action}</strong><small>{h.detail}</small></div>):<div className="empty-state">No activity yet.</div>}</div></Modal>
    <Modal open={settingsOpen} title="Planning settings" eyebrow="System" onClose={()=>setSettingsOpen(false)} footer={<button className="button primary" onClick={()=>setSettingsOpen(false)}>Done</button>}><div className="form-stack"><div><span className="field-caption">Life domains</span><div className="domain-grid">{Object.entries(state.settings.domains).map(([name,on])=><label className="domain-toggle" key={name}><input type="checkbox" checked={on} onChange={()=>toggleDomain(name)}/><span>{name}</span></label>)}</div></div><div className="form-grid"><label>Default weekly hours<input type="number" min="1" max="168" value={state.settings.defaultAvailableHours} onChange={e=>mutate('Default capacity changed',e.target.value,d=>{d.settings.defaultAvailableHours=Number(e.target.value)||40})}/></label><label>Default buffer %<input type="number" min="0" max="80" value={state.settings.defaultBufferPct} onChange={e=>mutate('Default buffer changed',e.target.value,d=>{d.settings.defaultBufferPct=Number(e.target.value)||20})}/></label></div></div></Modal>
  </div>
}
