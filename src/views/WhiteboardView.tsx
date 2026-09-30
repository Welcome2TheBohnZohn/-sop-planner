import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Icon, type IconName } from '../components/Icon'
import { Modal } from '../components/Modal'
import { usePlanner } from '../state/PlannerContext'
import type { BoardNode, BoardNodeType, Whiteboard } from '../types'

const TOOLS: Array<{type:BoardNodeType;icon:IconName;label:string}>=[
  {type:'note',icon:'note',label:'Note'},{type:'text',icon:'text',label:'Text'},{type:'shape',icon:'shape',label:'Shape'},{type:'chart',icon:'chart',label:'Chart'}
]

type NodeDrag={id:string,startX:number,startY:number,origX:number,origY:number}

export function WhiteboardView(){
  const {state,mutate,nextId}=usePlanner()
  const board=state.whiteboards.find(b=>b.id===state.activeWhiteboardId)??state.whiteboards[0]
  const [selected,setSelected]=useState<string|null>(null)
  const [editing,setEditing]=useState<BoardNode|null>(null)
  const [boardModal,setBoardModal]=useState<'new'|'rename'|null>(null)
  const [boardName,setBoardName]=useState('')
  const [connectFrom,setConnectFrom]=useState<string|null>(null)
  const drag=useRef<NodeDrag|null>(null)
  const viewport=useRef<HTMLDivElement>(null)
  const selectedNode=useMemo(()=>board?.nodes.find(n=>n.id===selected)??null,[board,selected])
  if(!board)return <div className="empty-state">No whiteboard available.</div>

  function patchBoard(action:string,detail:string,fn:(b:Whiteboard)=>void){mutate(action,detail,d=>{const b=d.whiteboards.find(x=>x.id===board.id);if(b)fn(b)})}
  function addNode(type:BoardNodeType){const id=nextId('N');const node:BoardNode={id,type,x:180+board.nodes.length*20,y:140+board.nodes.length*18,w:type==='chart'?280:240,h:type==='text'?90:150,title:type==='note'?'Note':type==='shape'?'Concept':type==='chart'?'Chart':'Text',text:type==='note'?'Capture an idea, question, constraint, or observation.':type==='text'?'Start typing…':'',tone:'neutral',shape:type==='shape'?'round':undefined,chartLabels:type==='chart'?['A','B','C']:undefined,chartValues:type==='chart'?[35,70,50]:undefined};patchBoard('Whiteboard item added',node.title,b=>b.nodes.push(node));setSelected(id);setEditing(structuredClone(node))}
  function pointerDown(e:ReactPointerEvent,node:BoardNode){if(connectFrom){if(connectFrom!==node.id){patchBoard('Connection added','',b=>b.edges.push({id:nextId('E'),from:connectFrom,to:node.id,label:''}));setConnectFrom(null)}return}setSelected(node.id);drag.current={id:node.id,startX:e.clientX,startY:e.clientY,origX:node.x,origY:node.y};e.currentTarget.setPointerCapture(e.pointerId)}
  function pointerMove(e:ReactPointerEvent){const g=drag.current;if(!g)return;const el=e.currentTarget as HTMLElement;el.style.transform=`translate(${e.clientX-g.startX}px,${e.clientY-g.startY}px)`}
  function pointerUp(e:ReactPointerEvent){const g=drag.current;drag.current=null;const el=e.currentTarget as HTMLElement;el.style.transform='';if(!g)return;const dx=(e.clientX-g.startX)/board.viewport.scale,dy=(e.clientY-g.startY)/board.viewport.scale;if(Math.abs(dx)<2&&Math.abs(dy)<2)return;patchBoard('Whiteboard item moved','',b=>{const n=b.nodes.find(x=>x.id===g.id);if(n){n.x=Math.round(g.origX+dx);n.y=Math.round(g.origY+dy)}})}
  function saveNode(){if(!editing)return;patchBoard('Whiteboard item saved',editing.title,b=>{const i=b.nodes.findIndex(n=>n.id===editing.id);if(i>=0)b.nodes[i]=editing});setEditing(null)}
  function duplicateSelected(){if(!selectedNode)return;const copy={...structuredClone(selectedNode),id:nextId('N'),x:selectedNode.x+30,y:selectedNode.y+30,title:`${selectedNode.title} copy`};patchBoard('Whiteboard item duplicated',copy.title,b=>b.nodes.push(copy));setSelected(copy.id)}
  function deleteSelected(){if(!selected)return;patchBoard('Whiteboard item deleted','',b=>{b.nodes=b.nodes.filter(n=>n.id!==selected);b.edges=b.edges.filter(e=>e.from!==selected&&e.to!==selected)});setSelected(null)}
  function openBoardModal(mode:'new'|'rename'){setBoardModal(mode);setBoardName(mode==='rename'?board.name:'')}
  function saveBoard(){const name=boardName.trim();if(!name)return;if(boardModal==='rename')patchBoard('Whiteboard renamed',name,b=>{b.name=name});else{const id=nextId('BOARD');mutate('Whiteboard created',name,d=>{d.whiteboards.push({id,name,nodes:[],edges:[],viewport:{x:50,y:50,scale:1}});d.activeWhiteboardId=id});setSelected(null)}setBoardModal(null)}
  function applyTemplate(kind:'brain'|'goal'|'decision'){
    const cx=300,cy=220
    const nodes:BoardNode[]=kind==='brain'?
      [{id:nextId('N'),type:'shape',x:cx,y:cy,w:240,h:120,title:'Central Question',text:'What are you trying to figure out?',tone:'amber',shape:'round'},...['Ideas','Constraints','Inputs','Next Actions'].map((t,i)=>({id:nextId('N'),type:'note' as const,x:cx+(i%2?340:-320),y:cy+(i<2?-100:160),w:220,h:130,title:t,text:'',tone:i===3?'sage' as const:'neutral' as const}))]
      :kind==='goal'?[{id:nextId('N'),type:'shape',x:cx,y:cy,w:240,h:120,title:'Outcome',text:'Definition of done',tone:'amber',shape:'round'},...['Milestones','Blockers','Actions'].map((t,i)=>({id:nextId('N'),type:'note' as const,x:cx-300+i*300,y:cy+220,w:220,h:130,title:t,text:'',tone:i===2?'sage' as const:'neutral' as const}))]
      :[{id:nextId('N'),type:'shape',x:cx,y:cy,w:240,h:120,title:'Decision',text:'What must be decided?',tone:'amber',shape:'diamond'},...['Option A','Option B','Criteria','Risks'].map((t,i)=>({id:nextId('N'),type:'note' as const,x:cx+(i%2?320:-300),y:cy+(i<2?-100:170),w:220,h:130,title:t,text:'',tone:'neutral' as const}))]
    patchBoard('Planning template added',kind,b=>{b.nodes.push(...nodes)})
  }
  function renderChart(n:BoardNode){const values=n.chartValues??[20,50,75],max=Math.max(...values,1);return <div className="mini-chart">{values.map((v,i)=><span key={i} style={{height:`${v/max*100}%`}}></span>)}</div>}
  function nodeCenter(id:string){const n=board.nodes.find(x=>x.id===id);return n?{x:n.x+n.w/2,y:n.y+n.h/2}:null}

  return <div className="board-view">
    <header className="board-topbar">
      <div className="board-title-cluster"><select value={board.id} onChange={e=>mutate('Whiteboard selected',e.target.value,d=>{d.activeWhiteboardId=e.target.value})}>{state.whiteboards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="icon-button subtle" onClick={()=>openBoardModal('new')} aria-label="New board"><Icon name="plus"/></button><button className="icon-button subtle" onClick={()=>openBoardModal('rename')} aria-label="Rename board"><Icon name="edit"/></button></div>
      <div className="board-template-actions"><button className="button" onClick={()=>applyTemplate('brain')}><Icon name="template"/>Brain Dump</button><button className="button" onClick={()=>applyTemplate('goal')}><Icon name="target"/>Goal Map</button><button className="button" onClick={()=>applyTemplate('decision')}><Icon name="connect"/>Decision Map</button></div>
      <div className="board-zoom"><button className="icon-button subtle" onClick={()=>patchBoard('Zoom adjusted','',b=>{b.viewport.scale=Math.max(.4,b.viewport.scale-.1)})}>−</button><span>{Math.round(board.viewport.scale*100)}%</span><button className="icon-button subtle" onClick={()=>patchBoard('Zoom adjusted','',b=>{b.viewport.scale=Math.min(2.5,b.viewport.scale+.1)})}>+</button></div>
    </header>
    <div className="board-workspace">
      <aside className="board-toolrail"><button className="tool-button active" title="Select"><Icon name="cursor"/><span>Select</span></button>{TOOLS.map(t=><button className="tool-button" key={t.type} onClick={()=>addNode(t.type)} title={`Add ${t.label}`}><Icon name={t.icon}/><span>{t.label}</span></button>)}<button className={`tool-button ${connectFrom?'active':''}`} onClick={()=>{setConnectFrom(selected);}} disabled={!selected} title="Connect selected"><Icon name="connect"/><span>Connect</span></button></aside>
      <div className="board-viewport" ref={viewport}>
        <div className="board-stage" style={{transform:`translate(${board.viewport.x}px,${board.viewport.y}px) scale(${board.viewport.scale})`}}>
          <svg className="board-edges" width="2400" height="1600" viewBox="0 0 2400 1600">{board.edges.map(edge=>{const a=nodeCenter(edge.from),b=nodeCenter(edge.to);if(!a||!b)return null;return <g key={edge.id}><path d={`M ${a.x} ${a.y} C ${a.x+80} ${a.y}, ${b.x-80} ${b.y}, ${b.x} ${b.y}`} /><circle cx={b.x} cy={b.y} r="3"/></g>})}</svg>
          {board.nodes.map(n=><div key={n.id} className={`board-node node-${n.type} tone-${n.tone} ${selected===n.id?'selected':''}`} style={{left:n.x,top:n.y,width:n.w,height:n.h}} onPointerDown={e=>pointerDown(e,n)} onPointerMove={pointerMove} onPointerUp={pointerUp} onDoubleClick={()=>setEditing(structuredClone(n))}>
            {n.type==='chart'?<><div className="node-kicker">CHART</div><strong>{n.title}</strong>{renderChart(n)}</>:n.type==='shape'?<div className={`shape-inner ${n.shape||'round'}`}><strong>{n.title}</strong><p>{n.text}</p></div>:n.type==='text'?<div className="text-node-copy">{n.text||n.title}</div>:<><div className="node-kicker">{n.type.toUpperCase()}</div><strong>{n.title}</strong><p>{n.text}</p></>}
          </div>)}
        </div>
        {selectedNode&&<div className="selection-toolbar"><button onClick={()=>setEditing(structuredClone(selectedNode))}><Icon name="edit"/>Edit</button><button onClick={()=>setConnectFrom(selectedNode.id)} className={connectFrom===selectedNode.id?'active':''}><Icon name="connect"/>Link</button><button onClick={duplicateSelected}><Icon name="duplicate"/>Duplicate</button><button className="danger" onClick={deleteSelected}><Icon name="trash"/>Delete</button></div>}
      </div>
    </div>

    <Modal open={!!editing} title="Edit whiteboard item" eyebrow="Whiteboard" onClose={()=>setEditing(null)} footer={<><button className="button" onClick={()=>setEditing(null)}>Cancel</button><button className="button primary" onClick={saveNode}><Icon name="save"/>Save</button></>}>
      {editing&&<div className="form-stack"><label>Title<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label><label>Text<textarea rows={5} value={editing.text} onChange={e=>setEditing({...editing,text:e.target.value})}/></label><div className="form-grid"><label>Tone<select value={editing.tone} onChange={e=>setEditing({...editing,tone:e.target.value as BoardNode['tone']})}><option value="neutral">Neutral</option><option value="amber">Amber</option><option value="sage">Sage</option><option value="bone">Bone</option></select></label>{editing.type==='shape'&&<label>Shape<select value={editing.shape} onChange={e=>setEditing({...editing,shape:e.target.value as BoardNode['shape']})}><option value="rect">Rectangle</option><option value="round">Rounded</option><option value="ellipse">Ellipse</option><option value="diamond">Diamond</option></select></label>}</div></div>}
    </Modal>
    <Modal open={!!boardModal} title={boardModal==='new'?'New board':'Rename board'} eyebrow="Planning Whiteboard" onClose={()=>setBoardModal(null)} footer={<><button className="button" onClick={()=>setBoardModal(null)}>Cancel</button><button className="button primary" onClick={saveBoard}><Icon name="save"/>{boardModal==='new'?'Create board':'Save name'}</button></>}><label className="form-stack">Board name<input autoFocus value={boardName} onChange={e=>setBoardName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();saveBoard()}}}/></label></Modal>
  </div>
}
