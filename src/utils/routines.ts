import type { PlannerState, Routine } from '../types'
import { blankWeek } from '../state/defaults'
import { monthKey, quarterKey, startOfWeek, todayKey } from './date'

export function routineDueKey(routine: Routine, date = todayKey()) {
  const d = new Date(`${date}T12:00:00`)
  const jsDay = d.getDay()
  const weekday = jsDay === 0 ? 7 : jsDay
  const dom = d.getDate()
  if (routine.cadence === 'Daily') return date
  if (routine.cadence === 'Weekly') {
    const trigger = Math.max(1, Math.min(7, Number(routine.trigger) || 1))
    return weekday >= trigger ? startOfWeek(date) : null
  }
  if (routine.cadence === 'Monthly') {
    const trigger = Math.max(1, Math.min(31, Number(routine.trigger) || 1))
    return dom >= trigger ? monthKey(date) : null
  }
  if (routine.cadence === 'Quarterly') return quarterKey(date)
  return null
}

function runtimeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function instantiateRoutineDraft(state: PlannerState, routine: Routine, runKey: string, manual = false) {
  if (!manual && state.routineRuns[routine.id] === runKey) return false
  const today = todayKey()
  const wk = startOfWeek(today)
  if (routine.destination === 'week') {
    const week = state.weekPlans[wk] ?? blankWeek()
    state.weekPlans[wk] = week
    if (!week.closed) {
      for (const item of routine.items) week.tray.push({ id: runtimeId('W'), title: item.title, estimateMin: item.estimateMin || 30, domain: routine.domain, inboxId: null })
    } else {
      for (const item of routine.items) state.inbox.unshift({ id: runtimeId('I'), title:item.title, estimateMin:item.estimateMin||30, domain:routine.domain, notes:`From SOP: ${routine.name}`, status:'inbox', weekKey:'', eventId:null, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() })
    }
  } else {
    for (const item of routine.items) state.inbox.unshift({ id: runtimeId('I'), title:item.title, estimateMin:item.estimateMin||30, domain:routine.domain, notes:`From SOP: ${routine.name}`, status:'inbox', weekKey:'', eventId:null, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() })
  }
  if (!manual) state.routineRuns[routine.id] = runKey
  return true
}
