import { useEffect, useState } from 'react'
import { PlannerProvider, usePlanner } from './state/PlannerContext'
import type { AppView, ScheduleSeed, TodoItem } from './types'
import { AppShell } from './components/AppShell'
import { InboxDrawer } from './components/InboxDrawer'
import { SearchPalette } from './components/SearchPalette'
import { ScheduleModal } from './components/ScheduleModal'
import { HomeView } from './views/HomeView'
import { QuarterView } from './views/QuarterView'
import { MonthView } from './views/MonthView'
import { WeekView } from './views/WeekView'
import { DayView } from './views/DayView'
import { TasksView } from './views/TasksView'
import { WhiteboardView } from './views/WhiteboardView'

function PlannerApp(){
  const {ready,state}=usePlanner()
  const [view,setView]=useState<AppView>('week')
  const [inboxOpen,setInboxOpen]=useState(false)
  const [searchOpen,setSearchOpen]=useState(false)
  const [scheduleSeed,setScheduleSeed]=useState<ScheduleSeed|null>(null)
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearchOpen(true)}if(e.key==='Escape'){setSearchOpen(false);setInboxOpen(false);setScheduleSeed(null)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[])
  if(!ready)return <div className="boot-screen"><div className="brand-mark large">SOP<span>›_</span></div><strong>Loading planner…</strong></div>
  function scheduleTodo(todo:TodoItem){setScheduleSeed({date:todo.due||state.selectedDate,time:'09:00',title:todo.title,type:'Task',source:{kind:'todo',id:todo.id}})}
  let content:React.ReactNode
  if(view==='home')content=<HomeView navigate={setView}/>
  else if(view==='quarter')content=<QuarterView/>
  else if(view==='month')content=<MonthView navigate={setView}/>
  else if(view==='week')content=<WeekView openSchedule={setScheduleSeed}/>
  else if(view==='day')content=<DayView openSchedule={setScheduleSeed}/>
  else if(view==='tasks')content=<TasksView scheduleTodo={scheduleTodo}/>
  else content=<WhiteboardView/>
  return <><AppShell view={view} navigate={setView} openInbox={()=>setInboxOpen(true)} openSearch={()=>setSearchOpen(true)} openSchedule={setScheduleSeed}>{content}</AppShell><InboxDrawer open={inboxOpen} onClose={()=>setInboxOpen(false)} openSchedule={setScheduleSeed}/><SearchPalette open={searchOpen} onClose={()=>setSearchOpen(false)} navigate={setView}/><ScheduleModal seed={scheduleSeed} onClose={()=>setScheduleSeed(null)}/></>
}

export default function App(){return <PlannerProvider><PlannerApp/></PlannerProvider>}
