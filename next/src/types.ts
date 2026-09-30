export type View='home'|'quarter'|'month'|'week'|'day'|'tasks'|'board'
export type EventType='Task'|'Event'|'Milestone'|'Decision Point'|'Deadline'|'Reminder'
export type GoalStatus='Not Started'|'On Track'|'At Risk'|'Blocked'|'Complete'

export interface ActionItem{id:string;title:string;dueDate:string;done:boolean}
export interface Goal{id:string;title:string;doneWhen:string;targetDate:string;status:GoalStatus;dependency:string;startDate:string;endDate:string;actions:ActionItem[]}
export interface Milestone{id:string;goalId:string;title:string;date:string;type:'Milestone'|'Decision Point'|'Deadline'}
export interface QuarterPlan{mission:string;goals:Goal[];milestones:Milestone[];risks:string;resources:string;aar:string}
export interface MonthPlan{mission:string;goals:string[];aar:string}
export interface WeekTask{id:string;title:string;estimateMin:number;domain:string;inboxId?:string}
export interface WeekPlan{mission:string;main:string;top3:string[];supports:string;constraints:string;decision:string;endState:string;tray:WeekTask[];wins:string;friction:string;lessons:string;nextMain:string;availableHours:number;bufferPct:number}
export interface DayPlan{focus:string;top3:string[];other:string[];worked:string;friction:string;carry:string}
export interface PlannerEvent{id:string;date:string;start:string;end:string;allDay:boolean;title:string;type:EventType;completed:boolean;domain:string;notes:string;original:{date:string;start:string;end:string;allDay:boolean};moves:{at:string;from:string;to:string}[]}
export interface InboxItem{id:string;title:string;estimateMin:number;domain:string;notes:string;status:'inbox'|'planned'|'scheduled'|'archived';weekKey:string;eventId?:string}
export interface Todo{id:string;title:string;done:boolean;due:string;domain:string;notes:string;scheduledEventId?:string}
export type NodeKind='note'|'text'|'shape'|'chart'
export interface BoardNode{id:string;kind:NodeKind;x:number;y:number;w:number;h:number;title:string;text:string;tone:'neutral'|'amber'|'sage'|'bone';shape?:'rect'|'round'|'ellipse'|'diamond'}
export interface BoardEdge{id:string;from:string;to:string}
export interface Board{id:string;name:string;nodes:BoardNode[];edges:BoardEdge[];scale:number}
export interface HistoryItem{id:string;at:string;action:string;detail:string}
export interface PlannerState{
  schemaVersion:1;nextId:number;selectedDate:string;events:PlannerEvent[];inbox:InboxItem[];todos:Todo[];
  quarterPlans:Record<string,QuarterPlan>;monthPlans:Record<string,MonthPlan>;weekPlans:Record<string,WeekPlan>;dayPlans:Record<string,DayPlan>;
  boards:Board[];activeBoardId:string;history:HistoryItem[];settings:{domains:Record<string,boolean>;defaultHours:number;defaultBuffer:number};
  legacyImportedAt?:string
}
export interface ScheduleSeed{date:string;time?:string;title?:string;type?:EventType;allDay?:boolean;source?:{kind:'todo'|'tray'|'inbox';id:string;weekKey?:string}}
