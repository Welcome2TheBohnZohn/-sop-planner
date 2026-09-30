import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react'
import type {PlannerState,QuarterPlan,MonthPlan,WeekPlan,DayPlan,Goal} from './types'

const DB='sop-planner-next', STORE='kv', STATE='planner-state', LEGACY='sop_planner_v4'
const domains=['Work','Family','Health','Personal','Admin']
export const pad=(n:number)=>String(n).padStart(2,'0')
export const dateKey=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
export const fromKey=(k:string)=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)}
export const addDays=(k:string,n:number)=>{const d=fromKey(k);d.setDate(d.getDate()+n);return dateKey(d)}
export const todayKey=()=>dateKey(new Date())
export const startWeek=(k:string)=>{const d=fromKey(k),day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));return dateKey(d)}
export const monthKey=(k:string)=>k.slice(0,7)
export const quarterKey=(k:string)=>{const d=fromKey(k);return `${d.getFullYear()}-Q${Math.floor(d.getMonth()/3)+1}`}
export const fmt=(k:string,o:Intl.DateTimeFormatOptions)=>fromKey(k).toLocaleDateString('en-US',o)
export const mins=(t:string)=>{if(!t)return 0;const [h,m]=t.split(':').map(Number);return h*60+m}
export const time=(n:number)=>`${pad(Math.floor(n/60))}:${pad(n%60)}`

const goal=(id:string):Goal=>({id,title:'',doneWhen:'',targetDate:'',status:'Not Started',dependency:'',startDate:'',endDate:'',actions:[]})
export const blankQuarter=(k='Q'):QuarterPlan=>({mission:'',goals:[0,1,2].map(i=>goal(`${k}-G${i+1}`)),milestones:[],risks:'',resources:'',aar:''})
export const blankMonth=():MonthPlan=>({mission:'',goals:['','',''],aar:''})
export const blankWeek=():WeekPlan=>({mission:'',main:'',top3:['','',''],supports:'',constraints:'',decision:'',endState:'',tray:[],wins:'',friction:'',lessons:'',nextMain:'',availableHours:40,bufferPct:20})
export const blankDay=():DayPlan=>({focus:'',top3:['','',''],other:[],worked:'',friction:'',carry:''})
const initial=():PlannerState=>({schemaVersion:1,nextId:100,selectedDate:todayKey(),events:[],inbox:[],todos:[],quarterPlans:{},monthPlans:{},weekPlans:{},dayPlans:{},boards:[{id:'B1',name:'Planning Whiteboard',scale:1,nodes:[{id:'N1',kind:'note',x:150,y:120,w:230,h:145,title:'Start here',text:'Think freely before work enters the plan.',tone:'bone'}],edges:[]}],activeBoardId:'B1',history:[],settings:{domains:Object.fromEntries(domains.map(d=>[d,true])),defaultHours:40,defaultBuffer:20}})

function openDb(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbGet<T>(k:string){const db=await openDb();return new Promise<T|undefined>((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(k);r.onsuccess=()=>resolve(r.result as T|undefined);r.onerror=()=>reject(r.error)})}
async function dbSet<T>(k:string,v:T){const db=await openDb();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,k);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})}

function migrate(old:any):PlannerState{
  const n=initial(); if(!old||typeof old!=='object')return n
  n.legacyImportedAt=new Date().toISOString(); n.nextId=Math.max(n.nextId,Number(old.nextId)||0)
  n.events=(Array.isArray(old.events)?old.events:[]).map((e:any)=>({id:String(e.id??crypto.randomUUID()),date:e.date||n.selectedDate,start:e.start||'',end:e.end||'',allDay:!!e.allDay,title:e.title||'Untitled',type:e.type||'Event',completed:!!e.completed,domain:e.domain||'',notes:e.context||'',original:e.original||{date:e.date||n.selectedDate,start:e.start||'',end:e.end||'',allDay:!!e.allDay},moves:Array.isArray(e.moves)?e.moves:[]}))
  n.inbox=(Array.isArray(old.inbox)?old.inbox:[]).map((i:any)=>({id:String(i.id??crypto.randomUUID()),title:i.title||'',estimateMin:Number(i.estimateMin)||30,domain:i.domain||'',notes:i.notes||'',status:i.status||'inbox',weekKey:i.weekKey||'',eventId:i.eventId||undefined}))
  n.todos=(Array.isArray(old.todos)?old.todos:[]).map((t:any)=>({id:String(t.id??crypto.randomUUID()),title:t.title||'',done:!!t.done,due:t.due||'',domain:t.domain||'',notes:t.notes||'',scheduledEventId:t.scheduledEventId||undefined}))
  for(const [k,p] of Object.entries<any>(old.quarterData||{})){const q=blankQuarter(k);q.mission=p.mission||'';q.risks=p.risks||'';q.resources=p.resources||'';q.aar=p.aar||'';(p.goals||[]).slice(0,3).forEach((g:any,i:number)=>{q.goals[i]={...q.goals[i],title:g.title||'',doneWhen:g.doneWhen||'',targetDate:g.targetDate||'',status:g.status||'Not Started',dependency:g.dependency||'',startDate:g.startDate||'',endDate:g.endDate||'',actions:Array.isArray(g.actions)?g.actions.map((a:any,j:number)=>({id:a.id||`${k}-A${i}-${j}`,title:a.title||'',dueDate:a.dueDate||'',done:!!a.done})):(g.nextAction?[{id:`${k}-A${i}`,title:g.nextAction,dueDate:'',done:false}]:[])}});n.quarterPlans[k]=q}
  return n
}
async function load(){try{const s=await dbGet<PlannerState>(STATE);if(s?.schemaVersion===1)return s}catch{};try{const raw=localStorage.getItem(LEGACY);if(raw){const m=migrate(JSON.parse(raw));await dbSet(STATE,m);return m}}catch{};const f=initial();try{await dbSet(STATE,f)}catch{}return f}

type Ctx={state:PlannerState;ready:boolean;status:'loading'|'saving'|'saved'|'error';mutate:(action:string,detail:string,fn:(s:PlannerState)=>void)=>void;replace:(s:PlannerState)=>void;id:(p:string)=>string;quarter:QuarterPlan;month:MonthPlan;week:WeekPlan;day:DayPlan}
const C=createContext<Ctx|null>(null)
export function Store({children}:{children:React.ReactNode}){const [state,setState]=useState(initial),[ready,setReady]=useState(false),[status,setStatus]=useState<Ctx['status']>('loading');const t=useRef<number>()
useEffect(()=>{load().then(s=>{setState(s);setReady(true);setStatus('saved')})},[])
useEffect(()=>{if(!ready)return;setStatus('saving');clearTimeout(t.current);t.current=window.setTimeout(()=>dbSet(STATE,state).then(()=>setStatus('saved')).catch(()=>setStatus('error')),160)},[state,ready])
const mutate=useCallback((action:string,detail:string,fn:(s:PlannerState)=>void)=>setState(prev=>{const d=structuredClone(prev);fn(d);d.history.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),action,detail});d.history=d.history.slice(0,250);return d}),[])
const id=useCallback((p:string)=>`${p}-${crypto.randomUUID()}`,[])
const qk=quarterKey(state.selectedDate),mk=monthKey(state.selectedDate),wk=startWeek(state.selectedDate)
const value=useMemo(()=>({state,ready,status,mutate,replace:setState,id,quarter:state.quarterPlans[qk]||blankQuarter(qk),month:state.monthPlans[mk]||blankMonth(),week:state.weekPlans[wk]||blankWeek(),day:state.dayPlans[state.selectedDate]||blankDay()}),[state,ready,status,mutate,id,qk,mk,wk])
return <C.Provider value={value}>{children}</C.Provider>}
export function useStore(){const c=useContext(C);if(!c)throw new Error('Store missing');return c}
