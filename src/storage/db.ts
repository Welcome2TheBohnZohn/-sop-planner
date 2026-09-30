import type { PlannerState } from '../types'
import { createInitialState } from '../state/defaults'

const DB_NAME = 'sop-planner'
const STORE = 'kv'
const STATE_KEY = 'planner-state'
const LEGACY_KEY = 'sop_planner_v4'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function get<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}

async function set<T>(key: string, value: T) {
  const db = await openDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function migrateLegacy(raw: unknown): PlannerState {
  const next = createInitialState()
  if (!raw || typeof raw !== 'object') return next
  const old = raw as Record<string, any>
  next.legacyImportedAt = new Date().toISOString()
  next.nextId = Math.max(next.nextId, Number(old.nextId) || 0)
  next.events = Array.isArray(old.events) ? old.events.map((e: any) => ({
    id: String(e.id ?? `LEGACY-${Math.random()}`),
    date: e.date || next.selectedDate,
    start: e.start || '',
    end: e.end || '',
    allDay: Boolean(e.allDay),
    title: e.title || 'Untitled',
    type: e.type || 'Event',
    completed: Boolean(e.completed),
    context: e.context || '',
    domain: e.domain || '',
    goalId: e.goalOverride || undefined,
    inboxId: e.inboxId || null,
    original: e.original || { date: e.date || next.selectedDate, start: e.start || '', end: e.end || '', allDay: Boolean(e.allDay) },
    moves: Array.isArray(e.moves) ? e.moves : []
  })) : []
  next.inbox = Array.isArray(old.inbox) ? old.inbox.map((i: any) => ({
    id: String(i.id ?? `I-${Date.now()}`), title: i.title || '', estimateMin: Number(i.estimateMin) || 30,
    domain: i.domain || '', notes: i.notes || '', status: i.status || 'inbox', weekKey: i.weekKey || '',
    eventId: i.eventId || null, createdAt: i.createdAt || new Date().toISOString(), updatedAt: i.updatedAt || new Date().toISOString()
  })) : []
  next.todos = Array.isArray(old.todos) ? old.todos.map((t: any) => ({
    id: String(t.id ?? `T-${Date.now()}`), title: t.title || '', done: Boolean(t.done), due: t.due || '',
    domain: t.domain || '', notes: t.notes || '', createdAt: t.createdAt || new Date().toISOString(),
    completedAt: t.completedAt || null, scheduledEventId: t.scheduledEventId || null
  })) : []

  const quarterData = old.quarterData && typeof old.quarterData === 'object' ? old.quarterData : {}
  for (const [key, value] of Object.entries<any>(quarterData)) {
    next.quarterPlans[key] = {
      mission: value.mission || '', risks: value.risks || '', resources: value.resources || '', aar: value.aar || '', closed: Boolean(value.closed),
      goals: (Array.isArray(value.goals) ? value.goals.slice(0, 3) : []).map((g: any, i: number) => ({
        id: `Q-${key}-${i}`, title: g.title || '', doneWhen: g.doneWhen || '', targetDate: g.targetDate || '', dependency: g.dependency || '',
        status: g.status || 'Not Started', startDate: g.startDate || '', endDate: g.endDate || '',
        actions: Array.isArray(g.actions) ? g.actions.map((a: any, ai: number) => ({ id: a.id || `QA-${i}-${ai}`, title: a.title || '', dueDate: a.dueDate || '', done: Boolean(a.done) })) : (g.nextAction ? [{ id: `QA-${i}-0`, title: g.nextAction, dueDate: '', done: false }] : [])
      })),
      milestones: []
    }
  }
  next.history = Array.isArray(old.history) ? old.history.slice(0, 200).map((h: any, i: number) => ({ id: `H-${i}`, at: h.ts || new Date().toISOString(), action: h.action || 'Legacy activity', detail: h.detail || '' })) : []
  return next
}

export async function loadPlannerState() {
  try {
    const existing = await get<PlannerState>(STATE_KEY)
    if (existing?.schemaVersion === 1) return existing
  } catch {
    // fall through to legacy/local fallback
  }
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (raw) {
      const migrated = migrateLegacy(JSON.parse(raw))
      await set(STATE_KEY, migrated)
      return migrated
    }
  } catch {
    // use fresh state
  }
  const fresh = createInitialState()
  try { await set(STATE_KEY, fresh) } catch { /* IndexedDB can be unavailable in restrictive contexts */ }
  return fresh
}

export async function savePlannerState(state: PlannerState) {
  try {
    await set(STATE_KEY, state)
  } catch {
    localStorage.setItem('sop_planner_next_fallback', JSON.stringify(state))
  }
}
