export type AppView = 'home' | 'quarter' | 'month' | 'week' | 'day' | 'tasks' | 'board'
export type Domain = 'Work' | 'Family' | 'Health' | 'Personal' | 'Admin' | string
export type EventType = 'Task' | 'Event' | 'Milestone' | 'Decision Point' | 'Deadline' | 'Reminder'
export type GoalStatus = 'Not Started' | 'On Track' | 'At Risk' | 'Blocked' | 'Complete'

export interface GoalAction {
  id: string
  title: string
  dueDate: string
  done: boolean
}

export interface Goal {
  id: string
  title: string
  doneWhen: string
  targetDate: string
  dependency: string
  status: GoalStatus
  startDate: string
  endDate: string
  supports?: string
  actions: GoalAction[]
}

export interface QuarterMilestone {
  id: string
  goalId: string
  title: string
  date: string
  type: 'Milestone' | 'Decision Point' | 'Deadline'
}

export interface QuarterPlan {
  mission: string
  goals: Goal[]
  milestones: QuarterMilestone[]
  risks: string
  resources: string
  aar: string
  closed: boolean
}

export interface MonthPlan {
  mission: string
  goals: Goal[]
  metric: string
  parking: string
  aar: string
  closed: boolean
}

export interface WeekTask {
  id: string
  title: string
  estimateMin: number
  domain: string
  inboxId?: string | null
}

export interface WeekPlan {
  mission: string
  main: string
  top3: [string, string, string]
  supports: string
  constraints: string
  decision: string
  endState: string
  tray: WeekTask[]
  wins: string
  friction: string
  lessons: string
  nextMain: string
  availableHours: number
  bufferPct: number
  closed: boolean
}

export interface DayPlan {
  focus: string
  top3: [string, string, string]
  other: string[]
  worked: string
  friction: string
  carry: string
}

export interface PlanEvent {
  id: string
  date: string
  start: string
  end: string
  allDay: boolean
  title: string
  type: EventType
  completed: boolean
  context: string
  domain: string
  goalId?: string
  inboxId?: string | null
  original: { date: string; start: string; end: string; allDay: boolean }
  moves: Array<{ at: string; from: string; to: string }>
}

export interface InboxItem {
  id: string
  title: string
  estimateMin: number
  domain: string
  notes: string
  status: 'inbox' | 'planned' | 'scheduled' | 'archived'
  weekKey: string
  eventId?: string | null
  createdAt: string
  updatedAt: string
}

export interface TodoItem {
  id: string
  title: string
  done: boolean
  due: string
  domain: string
  notes: string
  createdAt: string
  completedAt?: string | null
  scheduledEventId?: string | null
}

export type BoardNodeType = 'note' | 'text' | 'shape' | 'icon' | 'chart' | 'frame'
export interface BoardNode {
  id: string
  type: BoardNodeType
  x: number
  y: number
  w: number
  h: number
  title: string
  text: string
  tone: 'neutral' | 'amber' | 'sage' | 'bone'
  shape?: 'rect' | 'round' | 'ellipse' | 'diamond'
  icon?: string
  chartValues?: number[]
  chartLabels?: string[]
}

export interface BoardEdge {
  id: string
  from: string
  to: string
  label: string
}

export interface Whiteboard {
  id: string
  name: string
  nodes: BoardNode[]
  edges: BoardEdge[]
  viewport: { x: number; y: number; scale: number }
}

export interface HistoryItem {
  id: string
  at: string
  action: string
  detail: string
}

export interface PlannerSettings {
  domains: Record<string, boolean>
  defaultAvailableHours: number
  defaultBufferPct: number
}

export interface PlannerState {
  schemaVersion: 1
  nextId: number
  selectedDate: string
  events: PlanEvent[]
  inbox: InboxItem[]
  todos: TodoItem[]
  quarterPlans: Record<string, QuarterPlan>
  monthPlans: Record<string, MonthPlan>
  weekPlans: Record<string, WeekPlan>
  dayPlans: Record<string, DayPlan>
  whiteboards: Whiteboard[]
  activeWhiteboardId: string
  history: HistoryItem[]
  settings: PlannerSettings
  legacyImportedAt?: string
}

export interface ScheduleSeed {
  date: string
  time?: string
  title?: string
  type?: EventType
  allDay?: boolean
  source?: { kind: 'tray' | 'todo' | 'inbox'; id: string; weekKey?: string }
}
