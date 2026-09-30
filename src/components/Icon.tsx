import type { ReactNode, SVGProps } from 'react'

export type IconName = 'home' | 'target' | 'calendar' | 'week' | 'day' | 'tasks' | 'board' | 'search' | 'inbox' | 'plus' | 'more' | 'left' | 'right' | 'check' | 'edit' | 'trash' | 'clock' | 'template' | 'settings' | 'export' | 'import' | 'history' | 'save' | 'x' | 'note' | 'text' | 'shape' | 'chart' | 'connect' | 'hand' | 'cursor' | 'group' | 'duplicate' | 'fit' | 'menu' | 'archive' | 'repeat'

const paths: Record<IconName, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 9h18"/><path d="M7 13h3M14 13h3M7 17h3"/></>,
  week: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M13 4v16M18 4v16M3 9h18"/></>,
  day: <><circle cx="12" cy="12" r="7"/><path d="M12 8v4l3 2M12 2v2M12 20v2M2 12h2M20 12h2"/></>,
  tasks: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 11 2 2 5-5M8 17h8"/></>,
  board: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><circle cx="16" cy="15" r="1.5"/><path d="M9.5 9h3l2.5 5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  inbox: <><path d="M4 5h16l1 10H15l-2 3h-2l-2-3H3L4 5Z"/><path d="M8 9h8"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  left: <path d="m15 5-7 7 7 7"/>, right: <path d="m9 5 7 7-7 7"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  edit: <><path d="m5 16-1 4 4-1L19 8l-3-3L5 16Z"/><path d="m14 7 3 3"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  template: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M9 10h12"/></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10M8 4v6M16 14v6"/></>,
  export: <><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 13v7h14v-7"/></>,
  import: <><path d="M12 3v12M8 11l4 4 4-4"/><path d="M5 13v7h14v-7"/></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6M12 7v5l3 2"/></>,
  save: <><path d="M5 4h12l2 2v14H5V4Z"/><path d="M8 4v6h8V4M8 20v-6h8v6"/></>,
  x: <path d="m6 6 12 12M18 6 6 18"/>,
  note: <><path d="M5 4h14v11l-5 5H5V4Z"/><path d="M14 20v-5h5M8 8h8M8 12h6"/></>,
  text: <path d="M5 5h14M12 5v14M8 19h8"/>,
  shape: <><rect x="3" y="4" width="9" height="9" rx="1"/><circle cx="16.5" cy="15.5" r="4.5"/></>,
  chart: <><path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M3 20h18"/></>,
  connect: <><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="m8 8 8 8"/></>,
  hand: <><path d="M7 11V6a2 2 0 0 1 4 0v4-6a2 2 0 0 1 4 0v6-4a2 2 0 0 1 4 0v8c0 4-3 7-7 7h-1c-3 0-5-2-7-5l-2-3a2 2 0 0 1 3-2l2 2"/></>,
  cursor: <path d="m5 3 12 9-6 1-3 6-3-16Z"/>,
  group: <><rect x="3" y="5" width="10" height="10" rx="1"/><rect x="11" y="9" width="10" height="10" rx="1"/></>,
  duplicate: <><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M16 7V4H4v12h3"/></>,
  fit: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  archive: <><path d="M4 7h16v13H4V7ZM3 4h18v3H3V4Z"/><path d="M9 11h6"/></>,
  repeat: <><path d="M5 7h12l-2-2M19 17H7l2 2"/><path d="M19 7l2 2-2 2M5 17l-2-2 2-2"/></>
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>{paths[name]}</svg>
}
