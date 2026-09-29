import {useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

type Dash={organization:{name:string;plan:string};brief:{headline:string;generatedAt:string;items:{kind:string;text:string;severity?:string}[];attention:string[];metrics:{name:string;value:string;change:string;positive:boolean}[]};sources:{id:string;provider:string;name:string;status:string;lastSyncedAt:string;records:number}[];series:{id:string;name:string;unit:string;source:string;latest:number;points:{date:string;value:number}[]}[];alerts:{id:string;severity:string;title:string;detail:string;status:string;createdAt:string}[];workflows?:{id:string;name:string;trigger:string;action:string;status:string}[]};

const tabs=["Overview","Intelligence","Monitor","Forecast","Reports","Alerts","Data","Workflows","Settings"];

function App(){
const[tab,setTab]=useState("Overview");
const[status,setStatus]=useState("Checking");
const[data,setData]=useState<Dash|null>(null);
const[scan,setScan]=useState("Run intelligence scan");
const[result,setResult]=useState<any>(null);
const[query,setQuery]=useState("");
const[metric,setMetric]=useState("Revenue");

useEffect(()=>{
fetch("/api/dashboard").then(r=>r.ok?r.json():Promise.reject()).then(j=>{setData(j);setStatus("Operational");}).catch(()=>setStatus("Preview mode"));
},[]);

async function run(){
if(scan==="Scanning…")return;
setScan("Scanning…");
try{
const r=await fetch("/api/intelligence",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({metric,horizonDays:30})});
const j=await r.json();
if(!r.ok)throw new Error(j.error||"fail");
setResult(j);setScan("Scan complete");
}catch{setScan("Scan unavailable");}
finally{window.setTimeout(()=>setScan("Run intelligence scan"),1600);}
}

const q=query.toLowerCase();
const alerts=(data?.alerts||[]).filter(a=>!q||(a.title+a.detail).toLowerCase().includes(q));
const brief=data?.brief;

return <div className="app">
<aside>
<div className="brand"><span>V</span><div>VEYRA<small>BUSINESS INTELLIGENCE OS</small></div></div>
<nav aria-label="Primary">{tabs.map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}</nav>
<div className="sidebottom"><div className="statusdot"/><div><b>{status}</b><small>{data?.organization.name||"Veyra"} · {data?.organization.plan||"pilot"}</small></div></div>
</aside>
<main>
<header>
<div><p className="eyebrow">INTELLIGENCE STUDIO</p><h1>{tab}</h1><p className="muted">Connect your business. Veyra understands it. Veyra tells you what matters.</p></div>
<div className="header-actions">
<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search intelligence…" aria-label="Search"/>
<button className="primary" onClick={run} disabled={scan==="Scanning…"}>{scan}</button>
</div>
</header>

{brief&&<section className="metrics">{brief.metrics.slice(0,4).map(m=><div className="metric" key={m.name}><span>{m.name}</span><strong>{m.value}</strong><em className={m.positive?"up":"down"}>{m.change}</em></div>)}</section>}

{result&&<section className="result" role="status"><div><span className="eyebrow">LIVE RUN</span><h2>{result.metric}: {result.forecast?.value}</h2><p>{result.horizonDays}d · {Math.round((result.forecast?.confidence||0)*100)}% · {result.provenance?.modelVersion}</p><ul className="narrative">{(result.narrative||[]).map((n:string,i:number)=><li key={i}>{n}</li>)}</ul></div></section>}

{tab==="Overview"&&brief&&<>
<section className="brief panel">
<div className="panelhead"><div><span className="eyebrow">VEYRA DAILY</span><h2>{brief.headline}</h2></div></div>
<ul className="brief-list">{brief.items.map((item,i)=><li key={i}>{item.severity&&<b className={item.severity.toLowerCase()}>{item.severity}</b>}<span>{item.text}</span></li>)}</ul>
<div className="attention"><span className="eyebrow">REQUIRES ATTENTION</span><ol>{brief.attention.map((a,i)=><li key={i}>{a}</li>)}</ol></div>
</section>
<section className="grid">
<div className="panel large">
<div className="panelhead"><div><span className="eyebrow">MONITOR</span><h2>What changed</h2></div></div>
{(data?.series||[]).slice(0,4).map(s=><div className="series-card" key={s.id}><div><strong>{s.name}</strong><small>{s.source}</small></div><strong>{s.latest}</strong></div>)}
</div>
<div className="panel">
<div className="panelhead"><div><span className="eyebrow">ALERTS</span><h2>Needs attention</h2></div><button onClick={()=>setTab("Alerts")}>View all</button></div>
{alerts.slice(0,4).map(a=><article className="alert" key={a.id}><b className={a.severity.toLowerCase()}>{a.severity}</b><div><strong>{a.title}</strong><p>{a.detail}</p></div></article>)}
</div>
</section>
<section className="connectors panel">
<div className="panelhead"><div><span className="eyebrow">DATA LAYER</span><h2>Connected sources</h2></div></div>
<div className="connector-row">{(data?.sources||[]).map(s=><div className="connector" key={s.id}><span className="logo">{s.provider[0]}</span><div><strong>{s.name}</strong><small>{s.status} · {s.records.toLocaleString()} records</small></div><b className={s.status}>{s.status}</b></div>)}</div>
</section>
</>}

{(tab==="Intelligence"||tab==="Forecast")&&<section className="panel pagepanel">
<div className="panelhead"><div><span className="eyebrow">INTELLIGENCE</span><h2>Run analysis</h2></div></div>
<div className="form-row">
<label>Metric<select value={metric} onChange={e=>setMetric(e.target.value)}>{(data?.series||[{name:"Revenue"}]).map(s=><option key={s.name} value={s.name}>{s.name}</option>)}</select></label>
<button className="primary" onClick={run}>{scan}</button>
</div>
</section>}

{tab==="Monitor"&&<section className="panel pagepanel"><div className="panelhead"><div><span className="eyebrow">MONITOR</span><h2>Live metrics</h2></div></div><div className="monitor-grid">{(data?.series||[]).map(s=><div className="monitor-card" key={s.id}><strong>{s.name}</strong><div>{s.latest}</div><small className="muted">{s.source}</small></div>)}</div></section>}

{tab==="Reports"&&brief&&<section className="panel pagepanel"><div className="panelhead"><div><span className="eyebrow">REPORTS</span><h2>CEO daily brief</h2></div><button onClick={()=>window.print()}>Print</button></div><article className="report"><h3>{data?.organization.name} — Veyra Daily</h3><p><strong>{brief.headline}</strong></p><ul>{brief.items.map((i,idx)=><li key={idx}>{i.text}</li>)}</ul><ol>{brief.attention.map((a,idx)=><li key={idx}>{a}</li>)}</ol></article></section>}

{tab==="Alerts"&&<section className="panel pagepanel"><div className="panelhead"><div><span className="eyebrow">ALERTS</span><h2>Open</h2></div></div>{alerts.map(a=><article className="alert" key={a.id}><b className={a.severity.toLowerCase()}>{a.severity}</b><div><strong>{a.title}</strong><p>{a.detail}</p></div></article>)}</section>}

{tab==="Data"&&<section className="panel pagepanel"><div className="panelhead"><div><span className="eyebrow">DATA</span><h2>Sources</h2></div></div>{(data?.sources||[]).map(s=><div className="connector full" key={s.id}><span className="logo">{s.provider[0]}</span><div><strong>{s.name}</strong><small>{s.provider}</small></div><b className={s.status}>{s.status}</b></div>)}</section>}

{tab==="Workflows"&&<section className="panel pagepanel"><div className="panelhead"><div><span className="eyebrow">WORKFLOWS</span><h2>Insight to action</h2></div></div><div className="workflow">{(data?.workflows||[]).map(w=><div className="step" key={w.id}><span>●</span><div><strong>{w.name}</strong><p>{w.trigger} → {w.action}</p></div></div>)}</div></section>}

{tab==="Settings"&&<section className="panel pagepanel"><div className="panelhead"><div><span className="eyebrow">SETTINGS</span><h2>Organization</h2></div></div><dl className="settings"><div><dt>Organization</dt><dd>{data?.organization.name}</dd></div><div><dt>Plan</dt><dd>{data?.organization.plan}</dd></div><div><dt>Version</dt><dd>Veyra 1.0.0</dd></div></dl></section>}

<footer>Veyra Intelligence OS · v1.0.0 · Decision support, not financial advice.</footer>
</main>
</div>;
}

const rootEl=document.getElementById("root");
if(!rootEl)throw new Error("Root element #root not found");
createRoot(rootEl).render(<App/>);
