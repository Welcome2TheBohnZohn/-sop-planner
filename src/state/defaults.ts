import type { DayPlan, Goal, MonthPlan, PlannerState, QuarterPlan, WeekPlan, Whiteboard } from '../types'
import { todayKey } from '../utils/date'

export const defaultDomains = ['Work', 'Family', 'Health', 'Personal', 'Admin']

export function blankGoal(id: string): Goal {
  return {
    id,
    title: '',
    doneWhen: '',
    targetDate: '',
    dependency: '',
    status: 'Not Started',
    startDate: '',
    endDate: '',
    actions: []
  }
}

export function blankQuarter(idBase = 'QG'): QuarterPlan {
  return {
    mission: '',
    goals: [0, 1, 2].map(i => blankGoal(`${idBase}-${i + 1}`)),
    milestones: [],
    risks: '',
    resources: '',
    aar: '',
    closed: false
  }
}

export function blankMonth(idBase = 'MG'): MonthPlan {
  return {
    mission: '',
    goals: [0, 1, 2].map(i => ({ ...blankGoal(`${idBase}-${i + 1}`), supports: '' })),
    metric: '',
    parking: '',
    aar: '',
    closed: false
  }
}

export function blankWeek(): WeekPlan {
  return {
    mission: '',
    main: '',
    top3: ['', '', ''],
    supports: '',
    constraints: '',
    decision: '',
    endState: '',
    tray: [],
    wins: '',
    friction: '',
    lessons: '',
    nextMain: '',
    availableHours: 40,
    bufferPct: 20,
    closed: false
  }
}

export function blankDay(): DayPlan {
  return { focus: '', top3: ['', '', ''], top3Done:[false,false,false], other: [], otherDone:[], worked: '', friction: '', carry: '' }
}

export function initialBoard(): Whiteboard {
  return {
    id: 'BOARD-1',
    name: 'Planning Whiteboard',
    viewport: { x: 80, y: 70, scale: 1 },
    nodes: [
      { id: 'N-1', type: 'note', x: 180, y: 120, w: 240, h: 150, title: 'Start here', text: 'Use this space to think before work becomes part of the plan.', tone: 'bone' },
      { id: 'N-2', type: 'shape', x: 520, y: 150, w: 220, h: 120, title: 'Question', text: 'What matters most?', tone: 'amber', shape: 'round' }
    ],
    edges: [{ id: 'E-1', from: 'N-1', to: 'N-2', label: '' }]
  }
}

export function createInitialState(): PlannerState {
  return {
    schemaVersion: 1,
    nextId: 100,
    selectedDate: todayKey(),
    events: [],
    inbox: [],
    todos: [],
    quarterPlans: {},
    monthPlans: {},
    weekPlans: {},
    dayPlans: {},
    whiteboards: [initialBoard()],
    activeWhiteboardId: 'BOARD-1',
    history: [],
    routines: [],
    routineRuns: {},
    weekTemplate: null,
    settings: {
      domains: Object.fromEntries(defaultDomains.map(d => [d, true])),
      defaultAvailableHours: 40,
      defaultBufferPct: 20
    }
  }
}
