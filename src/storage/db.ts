import type { BoardNode, Goal, PlannerState, Routine, WeekTask } from '../types'
import { blankDay, blankMonth, blankQuarter, blankWeek, createInitialState, initialBoard } from '../state/defaults'
import { monthKey, quarterKey, startOfWeek } from '../utils/date'

const DB_NAME = 'sop-planner'
const STORE = 'kv'
const STATE_KEY = 'planner-state'
const LEGACY_KEY = 'sop_planner_v4'
const FALLBACK_KEY = 'sop_planner_next_fallback'

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

function mapGoal(g: any, id: string): Goal {
  const actions = Array.isArray(g?.actions)
    ? g.actions.map((a: any, i: number) => ({
        id: String(a?.id || `${id}-A${i + 1}`),
        title: typeof a === 'string' ? a : (a?.title || ''),
        dueDate: typeof a === 'string' ? '' : (a?.dueDate || a?.targetDate || ''),
        done: typeof a === 'string' ? false : Boolean(a?.done)
      }))
    : g?.nextAction
      ? [{ id: `${id}-A1`, title: String(g.nextAction), dueDate: '', done: false }]
      : []
  return {
    id,
    title: g?.title || '',
    doneWhen: g?.doneWhen || '',
    targetDate: g?.targetDate || '',
    dependency: g?.dependency || '',
    status: g?.status || 'Not Started',
    startDate: g?.startDate || '',
    endDate: g?.endDate || '',
    supports: g?.supports === undefined || g?.supports === null ? '' : String(g.supports),
    actions
  }
}

function normalizeWeekTask(item: any, key: string, index: number): WeekTask {
  if (typeof item === 'string') return { id: `W-${key}-${index}`, title: item, estimateMin: 30, domain: '', inboxId: null }
  return {
    id: String(item?.id || `W-${key}-${index}`),
    title: item?.title || item?.text || '',
    estimateMin: Math.max(5, Number(item?.estimateMin) || 30),
    domain: item?.domain || '',
    inboxId: item?.inboxId || null
  }
}

function normalizeNextState(state: PlannerState): PlannerState {
  const fresh = createInitialState()
  const next = { ...fresh, ...state } as PlannerState
  next.events = Array.isArray(state.events) ? state.events : []
  next.inbox = Array.isArray(state.inbox) ? state.inbox : []
  next.todos = Array.isArray(state.todos) ? state.todos : []
  next.quarterPlans = state.quarterPlans && typeof state.quarterPlans === 'object' ? state.quarterPlans : {}
  next.monthPlans = state.monthPlans && typeof state.monthPlans === 'object' ? state.monthPlans : {}
  next.weekPlans = state.weekPlans && typeof state.weekPlans === 'object' ? state.weekPlans : {}
  next.dayPlans = state.dayPlans && typeof state.dayPlans === 'object' ? state.dayPlans : {}
  next.history = Array.isArray(state.history) ? state.history : []
  next.routines = Array.isArray(state.routines) ? state.routines : []
  next.routineRuns = state.routineRuns && typeof state.routineRuns === 'object' ? state.routineRuns : {}
  next.weekTemplate = state.weekTemplate ?? null
  next.settings = {
    ...fresh.settings,
    ...(state.settings || {}),
    domains: { ...fresh.settings.domains, ...(state.settings?.domains || {}) }
  }
  next.whiteboards = Array.isArray(state.whiteboards) && state.whiteboards.length ? state.whiteboards : [initialBoard()]
  if (!next.activeWhiteboardId || !next.whiteboards.some(b => b.id === next.activeWhiteboardId)) next.activeWhiteboardId = next.whiteboards[0].id
  return next
}

function migrateLegacy(raw: unknown): PlannerState {
  const next = createInitialState()
  if (!raw || typeof raw !== 'object') return next
  const old = raw as Record<string, any>
  const now = new Date().toISOString()

  next.legacyImportedAt = now
  next.nextId = Math.max(next.nextId, Number(old.nextId) || 0)
  next.settings = {
    defaultAvailableHours: Math.max(1, Number(old.settings?.defaultAvailableHours) || 40),
    defaultBufferPct: Math.max(0, Math.min(80, Number(old.settings?.defaultBufferPct) || 20)),
    domains: { ...next.settings.domains, ...(old.settings?.domains || {}) }
  }

  next.events = Array.isArray(old.events) ? old.events.map((e: any, i: number) => ({
    id: String(e.id ?? `LEGACY-E-${i}`),
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

  next.inbox = Array.isArray(old.inbox) ? old.inbox.map((i: any, index: number) => ({
    id: String(i.id ?? `I-LEGACY-${index}`),
    title: i.title || '',
    estimateMin: Math.max(5, Number(i.estimateMin) || 30),
    domain: i.domain || '',
    notes: i.notes || '',
    status: i.status || 'inbox',
    weekKey: i.weekKey || '',
    eventId: i.eventId || null,
    createdAt: i.createdAt || now,
    updatedAt: i.updatedAt || i.createdAt || now
  })) : []

  next.todos = Array.isArray(old.todos) ? old.todos.map((t: any, index: number) => ({
    id: String(t.id ?? `T-LEGACY-${index}`),
    title: t.title || '',
    done: Boolean(t.done),
    due: t.due || '',
    domain: t.domain || '',
    notes: t.notes || '',
    createdAt: t.createdAt || now,
    completedAt: t.completedAt || null,
    scheduledEventId: t.scheduledEventId || null
  })) : []

  const quarterData = old.quarterData && typeof old.quarterData === 'object' ? old.quarterData : {}
  for (const [key, value] of Object.entries<any>(quarterData)) {
    const base = blankQuarter(`QG-${key}`)
    const legacyGoals = Array.isArray(value.goals) ? value.goals.slice(0, 3) : []
    next.quarterPlans[key] = {
      mission: value.mission || '',
      risks: value.risks || '',
      resources: value.resources || '',
      aar: value.aar || '',
      closed: Boolean(value.closed),
      goals: base.goals.map((g, i) => legacyGoals[i] ? mapGoal(legacyGoals[i], g.id) : g),
      milestones: []
    }
  }

  const monthData = old.monthData && typeof old.monthData === 'object' ? old.monthData : {}
  for (const [key, value] of Object.entries<any>(monthData)) {
    const base = blankMonth(`MG-${key}`)
    const legacyGoals = Array.isArray(value.goals) ? value.goals.slice(0, 3) : []
    next.monthPlans[key] = {
      mission: value.mission || '',
      metric: value.metric || '',
      parking: value.parking || '',
      aar: value.aar || '',
      closed: Boolean(value.closed),
      goals: base.goals.map((g, i) => legacyGoals[i] ? mapGoal(legacyGoals[i], g.id) : g)
    }
  }

  const weekData = old.weekData && typeof old.weekData === 'object' ? old.weekData : {}
  for (const [key, value] of Object.entries<any>(weekData)) {
    const base = blankWeek()
    const p = Array.isArray(value.p) ? value.p : Array.isArray(value.top3) ? value.top3 : []
    next.weekPlans[key] = {
      ...base,
      mission: value.mission || '',
      main: value.main || '',
      top3: [String(p[0] || ''), String(p[1] || ''), String(p[2] || '')],
      supports: value.supporting || (typeof value.supports === 'string' && !/^\d+$/.test(value.supports) ? value.supports : ''),
      constraints: value.risks || value.constraints || '',
      decision: value.decision || '',
      endState: value.end || value.endState || '',
      tray: Array.isArray(value.tray) ? value.tray.map((t: any, i: number) => normalizeWeekTask(t, key, i)) : [],
      wins: value.wins || '',
      friction: value.friction || '',
      lessons: value.lessons || '',
      nextMain: value.next || value.nextMain || '',
      availableHours: Math.max(1, Number(value.availableHours || value.capacity) || next.settings.defaultAvailableHours),
      bufferPct: Number.isFinite(Number(value.bufferPct)) ? Math.max(0, Math.min(80, Number(value.bufferPct))) : next.settings.defaultBufferPct,
      closed: Boolean(value.closed)
    }
  }

  const dayData = old.dayData && typeof old.dayData === 'object' ? old.dayData : {}
  for (const [key, value] of Object.entries<any>(dayData)) {
    const base = blankDay()
    const tasks = Array.isArray(value.tasks) ? value.tasks.map((t: any) => String(t || '')).filter(Boolean) : []
    const done = Array.isArray(value.done) ? value.done : []
    const openTasks = tasks.filter((_: string, i: number) => !done[i])
    next.dayPlans[key] = {
      ...base,
      focus: value.focus || '',
      top3: [openTasks[0] || '', openTasks[1] || '', openTasks[2] || ''],
      other: openTasks.slice(3),
      worked: value.worked || value.aar || '',
      friction: value.friction || '',
      carry: value.carry || ''
    }
  }

  const legacyBoards = Array.isArray(old.whiteboards) ? old.whiteboards : []
  if (legacyBoards.length) {
    next.whiteboards = legacyBoards.map((b: any, bi: number) => ({
      id: String(b.id || `BOARD-LEGACY-${bi}`),
      name: b.name || 'Whiteboard',
      viewport: {
        x: Number(b.viewport?.x) || 0,
        y: Number(b.viewport?.y) || 0,
        scale: Math.max(.25, Math.min(3, Number(b.viewport?.scale) || 1))
      },
      nodes: (Array.isArray(b.nodes) ? b.nodes : []).map((n: any, ni: number): BoardNode => ({
        id: String(n.id || `N-LEGACY-${bi}-${ni}`),
        type: ['note','text','shape','icon','chart','frame'].includes(n.type) ? n.type : 'note',
        x: Number(n.x) || 0,
        y: Number(n.y) || 0,
        w: Math.max(80, Number(n.w) || 220),
        h: Math.max(60, Number(n.h) || 130),
        title: n.title || '',
        text: n.text || '',
        tone: ['neutral','amber','sage','bone'].includes(n.tone) ? n.tone : 'neutral',
        shape: ['rect','round','ellipse','diamond'].includes(n.shape) ? n.shape : undefined,
        icon: n.icon || undefined,
        chartValues: Array.isArray(n.chartValues) ? n.chartValues.map(Number) : Array.isArray(n.values) ? n.values.map(Number) : undefined,
        chartLabels: Array.isArray(n.chartLabels) ? n.chartLabels.map(String) : Array.isArray(n.labels) ? n.labels.map(String) : undefined
      })),
      edges: (Array.isArray(b.edges) ? b.edges : []).map((e: any, ei: number) => ({
        id: String(e.id || `EDGE-LEGACY-${bi}-${ei}`),
        from: String(e.from || ''),
        to: String(e.to || ''),
        label: e.label || ''
      })).filter((e: any) => e.from && e.to)
    }))
    next.activeWhiteboardId = next.whiteboards.some(b => b.id === old.activeWhiteboardId) ? old.activeWhiteboardId : next.whiteboards[0].id
  }

  next.routines = Array.isArray(old.routines) ? old.routines.map((r: any, index: number): Routine => ({
    id: String(r.id || `S-LEGACY-${index}`),
    name: r.name || 'Untitled SOP',
    cadence: ['Daily','Weekly','Monthly','Quarterly','Manual'].includes(r.cadence) ? r.cadence : 'Manual',
    destination: r.destination === 'week' ? 'week' : 'inbox',
    domain: r.domain || '',
    trigger: r.trigger || '',
    items: (Array.isArray(r.items) ? r.items : []).map((it: any, ii: number) => ({
      id: String(it?.id || `SI-${index}-${ii}`),
      title: typeof it === 'string' ? it : (it?.title || ''),
      estimateMin: Math.max(5, Number(typeof it === 'string' ? 30 : it?.estimateMin) || 30)
    })).filter((it: any) => it.title),
    active: r.active !== false,
    createdAt: r.createdAt || now
  })) : []
  next.routineRuns = old.routineRuns && typeof old.routineRuns === 'object' ? old.routineRuns : {}
  next.weekTemplate = old.weekTemplate && typeof old.weekTemplate === 'object' ? old.weekTemplate : null

  next.history = Array.isArray(old.history) ? old.history.slice(0, 250).map((h: any, i: number) => ({
    id: String(h.id || `H-LEGACY-${i}`),
    at: h.at || h.ts || now,
    action: h.action || 'Legacy activity',
    detail: h.detail || ''
  })) : []

  // Promote legacy quarter-map milestone events into the new quarter map model.
  for (const event of next.events) {
    if (!['Milestone','Decision Point','Deadline'].includes(event.type)) continue
    const match = String(event.context || '').match(/QGOAL:(\d+)/)
    if (!match) continue
    const qk = quarterKey(event.date)
    if (!next.quarterPlans[qk]) next.quarterPlans[qk] = blankQuarter(`QG-${qk}`)
    const goalIndex = Math.max(0, Math.min(2, Number(match[1]) || 0))
    const goal = next.quarterPlans[qk].goals[goalIndex]
    if (!goal) continue
    if (!next.quarterPlans[qk].milestones.some(m => m.title === event.title && m.date === event.date)) {
      next.quarterPlans[qk].milestones.push({
        id: `QM-LEGACY-${event.id}`,
        goalId: goal.id,
        title: event.title,
        date: event.date,
        type: event.type as 'Milestone' | 'Decision Point' | 'Deadline'
      })
    }
  }

  // Preserve the most relevant selected day when the legacy app had one.
  if (typeof old.selectedDate === 'string') next.selectedDate = old.selectedDate
  else if (typeof old.selected === 'string') next.selectedDate = old.selected

  return normalizeNextState(next)
}

export async function loadPlannerState() {
  try {
    const existing = await get<PlannerState>(STATE_KEY)
    if (existing?.schemaVersion === 1) return normalizeNextState(existing)
  } catch {
    // fall through to local fallback
  }
  try {
    const rawFallback = localStorage.getItem(FALLBACK_KEY)
    if(rawFallback){
      const parsed=JSON.parse(rawFallback) as PlannerState
      if(parsed?.schemaVersion===1)return normalizeNextState(parsed)
    }
  } catch {
    // continue to legacy migration
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
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(state))
  }
}
