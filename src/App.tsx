import { useEffect, useState, type ReactNode } from 'react'
import { PlannerProvider, usePlanner } from './state/PlannerContext'
import type { AppView, ScheduleSeed, TodoItem } from './types'
import { AppShell } from './components/AppShell'
import { InboxDrawer } from './components/InboxDrawer'
import { SearchPalette } from './components/SearchPalette'
import { ScheduleModal } from './components/ScheduleModal'
import { RoutinesModal } from './components/RoutinesModal'
import { HomeView } from './views/HomeView'
import { QuarterView } from './views/QuarterView'
import { MonthView } from './views/MonthView'
import { WeekView } from './views/WeekView'
import { DayView } from './views/DayView'
import { TasksView } from './views/TasksView'
import { WhiteboardView } from './views/WhiteboardView'
import { instantiateRoutineDraft, routineDueKey } from './utils/routines'

function PlannerApp(){
  const {ready,state,mutate}=usePlanner()
  const [view,setView]=useState<AppView>('week')
  const [inboxOpen,setInboxOpen]=useState(false)
  const [searchOpen,setSearchOpen]=useState(false)
  const [scheduleSeed,setScheduleSeed]=useState<ScheduleSeed|null>(null)
  const [routinesOpen,setRoutinesOpen]=useState(false)
  useEffect(()=>{
    const due=state.routines.filter(r=>r.active&&r.cadence!=='Manual').map(r=>({r,key:routineDueKey(r)})).filter(x=>x.key&&state.routineRuns[x.r.id]!==x.key)
    if(due.length)mutate('Recurring SOPs instantiated',`${due.length} routine${due.length===1?'':'s'}`,d=>{for(const item of due){const r=d.routines.find(x=>x.id===item.r.id);if(r&&item.key)instantiateRoutineDraft(d,r,item.key)}})
  },[ready,state.routines,state.routineRuns,mutate])
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearchOpen(true)}if(e.key==='Escape'){setSearchOpen(false);setInboxOpen(false);setScheduleSeed(null)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[])
  if(!ready)return <div className="boot-screen"><div className="brand-mark large">SOP<span>›_</span></div><strong>Loading planner…</strong></div>
  function scheduleTodo(todo:TodoItem){setScheduleSeed({date:todo.due||state.selectedDate,time:'09:00',title:todo.title,type:'Task',source:{kind:'todo',id:todo.id}})}
  let content:ReactNode
  if(view==='home')content=<HomeView navigate={setView}/>
  else if(view==='quarter')content=<QuarterView/>
  else if(view==='month')content=<MonthView navigate={setView}/>
  else if(view==='week')content=<WeekView openSchedule={setScheduleSeed}/>
  else if(view==='day')content=<DayView openSchedule={setScheduleSeed}/>
  else if(view==='tasks')content=<TasksView scheduleTodo={scheduleTodo}/>
  else content=<WhiteboardView/>
  return <><AppShell view={view} navigate={setView} openInbox={()=>setInboxOpen(true)} openSearch={()=>setSearchOpen(true)} openSchedule={setScheduleSeed} openRoutines={()=>setRoutinesOpen(true)}>{content}</AppShell><InboxDrawer open={inboxOpen} onClose={()=>setInboxOpen(false)} openSchedule={setScheduleSeed}/><SearchPalette open={searchOpen} onClose={()=>setSearchOpen(false)} navigate={setView}/><ScheduleModal seed={scheduleSeed} onClose={()=>setScheduleSeed(null)}/><RoutinesModal open={routinesOpen} onClose={()=>setRoutinesOpen(false)}/></>
}

export default function App(){return <PlannerProvider><PlannerApp/></PlannerProvider>}
