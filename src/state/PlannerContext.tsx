import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import type { DayPlan, MonthPlan, PlannerState, QuarterPlan, WeekPlan } from '../types'
import { loadPlannerState, savePlannerState } from '../storage/db'
import { blankDay, blankMonth, blankQuarter, blankWeek, createInitialState } from './defaults'
import { monthKey, quarterKey, startOfWeek } from '../utils/date'

type SaveStatus = 'loading' | 'saved' | 'saving' | 'error'

type PlannerContextValue = {
  state: PlannerState
  ready: boolean
  saveStatus: SaveStatus
  canUndo: boolean
  undo: () => void
  mutate: (action: string, detail: string, fn: (draft: PlannerState) => void) => void
  replaceState: (state: PlannerState) => void
  nextId: (prefix: string) => string
  quarter: (date?: string) => QuarterPlan
  month: (date?: string) => MonthPlan
  week: (date?: string) => WeekPlan
  day: (date?: string) => DayPlan
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

export function PlannerProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PlannerState>(createInitialState)
  const [ready, setReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const timer = useRef<number | null>(null)
  const undoStack = useRef<PlannerState[]>([])
  const [canUndo,setCanUndo] = useState(false)

  useEffect(() => {
    let active = true
    loadPlannerState().then(loaded => {
      if (!active) return
      setState(loaded)
      setReady(true)
      setSaveStatus('saved')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!ready) return
    setSaveStatus('saving')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      savePlannerState(state).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error'))
    }, 180)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [state, ready])

  const mutate = useCallback((action: string, detail: string, fn: (draft: PlannerState) => void) => {
    setState(prev => {
      undoStack.current.push(structuredClone(prev))
      if(undoStack.current.length>50)undoStack.current.shift()
      setCanUndo(true)
      const draft = structuredClone(prev)
      fn(draft)
      draft.history.unshift({ id: `H-${Date.now()}-${draft.nextId++}`, at: new Date().toISOString(), action, detail })
      draft.history = draft.history.slice(0, 250)
      return draft
    })
  }, [])

  const undo = useCallback(() => {
    const previous=undoStack.current.pop()
    if(!previous)return
    previous.history.unshift({id:`H-${Date.now()}-${previous.nextId++}`,at:new Date().toISOString(),action:'Undo',detail:'Reverted the last planner change'})
    setState(previous)
    setCanUndo(undoStack.current.length>0)
  }, [])

  const replaceState = useCallback((next: PlannerState) => {
    undoStack.current=[]
    setCanUndo(false)
    setState(next)
  }, [])
  const nextId = useCallback((prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, [])

  const quarter = useCallback((date = state.selectedDate) => state.quarterPlans[quarterKey(date)] ?? blankQuarter(`QG-${quarterKey(date)}`), [state])
  const month = useCallback((date = state.selectedDate) => state.monthPlans[monthKey(date)] ?? blankMonth(`MG-${monthKey(date)}`), [state])
  const week = useCallback((date = state.selectedDate) => state.weekPlans[startOfWeek(date)] ?? blankWeek(), [state])
  const day = useCallback((date = state.selectedDate) => state.dayPlans[date] ?? blankDay(), [state])

  const value = useMemo(() => ({ state, ready, saveStatus, canUndo, undo, mutate, replaceState, nextId, quarter, month, week, day }), [state, ready, saveStatus, canUndo, undo, mutate, replaceState, nextId, quarter, month, week, day])
  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner() {
  const value = useContext(PlannerContext)
  if (!value) throw new Error('usePlanner must be used inside PlannerProvider')
  return value
}
