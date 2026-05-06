import { useState, useMemo, useEffect } from "react";

// Storage shim — uses localStorage so CSV export works on real websites
const _storage = {
  async list(prefix) {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    return { keys };
  },
  async get(key) {
    const value = localStorage.getItem(key);
    return value !== null ? { value } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, String(value));
    return { key, value };
  }
};



const WHEEL_CATS = [
  { key: "customerSatisfaction", label: "Customer Satisfaction", desc: "Complaints & happy customers", emoji: "⭐" },
  { key: "staffMood", label: "Team Mood", desc: "Happy & inclusive team", emoji: "😊" },
  { key: "communication", label: "Communication", desc: "Open dialogue — customers & all staff", emoji: "💬" },
  { key: "teamCohesiveness", label: "Team Cohesiveness", desc: "Working well together & assisting others", emoji: "🤝" },
  { key: "checklistEfficiency", label: "Checklist Efficiency", desc: "Checklists completed acceptably & on time", emoji: "✅" },
  { key: "staffUtilisation", label: "Team Utilisation", desc: "People consistently have tasks to do", emoji: "⚡" },
  { key: "productivity", label: "Productivity", desc: "Completing tasks & working diligently", emoji: "🚀" },
  { key: "cleanliness", label: "Cleanliness", desc: "Quick clean up, smell & tidiness", emoji: "✨" },
  { key: "dogBehaviour", label: "Dog Behaviour", desc: "Dog energy levels, mood & incidents", emoji: "🐕" },
  { key: "barking", label: "Barking", desc: "Noise levels", emoji: "🔊" },
];

const SCORE_LABELS = { 2:"2", 3:"Bad", 4:"Poor", 5:"Okay", 6:"Good", 7:"Great", 8:"Excellent", 9:"Outstanding", 10:"Perfection" };
const MOODS = ["😄","😊","😐","😕","😤"];
const MOOD_LABELS = ["Great","Good","Okay","Down","Stressed"];
const BUSYNESS_LABELS = { 1:"Very Quiet", 2:"Quiet", 3:"Slow", 4:"Gentle", 5:"Normal", 6:"Busy", 7:"Very Busy", 8:"Hectic", 9:"Almost Chaotic", 10:"Chaotic Madness" };
const EMPTY_OPS = { daycareDogs:"", daycareStaff:"", groomingDogs:"", groomers:"", boardingDogs:"", playcareDogs:"", walkIns:"", newClientPacks:"" };
const OPS_FIELDS = [
  ["daycareDogs","Daycare Dogs","🐕"],
  ["daycareStaff","Daycare Team on Site","👤"],
  ["groomingDogs","Grooming Dogs","✂️"],
  ["groomers","Groomers on Site","💈"],
  ["boardingDogs","Boarding Dogs","🛏️"],
  ["playcareDogs","Playcare Dogs","🎾"],
  ["walkIns","Walk-ins","🚶"],
  ["newClientPacks","New Client Packs","📦"],
];

function buildCSV(reports) {
  const sorted = [...reports].sort((a,b) => a.date.localeCompare(b.date));
  const headers = ["Date","Total Hours","Team Names","Team Moods","Team Hours","Level Of Busy Score","Level Of Busy Label",...WHEEL_CATS.map(c=>c.label),...OPS_FIELDS.map(([,label])=>label),"Notes"];
  const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const rows = sorted.map(r => [
    r.date, r.totalHours,
    r.staff.map(s=>s.name).join(", "),
    r.staff.map(s=>s.mood).join(", "),
    r.staff.map(s=>s.hours).join(", "),
    r.busyness.score, r.busyness.label,
    ...WHEEL_CATS.map(c=>r.wheel[c.key]??""),
    ...OPS_FIELDS.map(([key])=>r.operations[key]??0),
    r.notes??""
  ].map(esc));
  return [headers.map(esc), ...rows].map(r=>r.join(",")).join("\n");
}

// ── History Screen ────────────────────────────────────────────────
function HistoryScreen({ reports, onBack, onEdit }) {
  const C = { teal:"#0f766e", pink:"#E3A825", muted:"#64748b", border:"#e2e8f0", text:"#0f172a" };
  const sorted = [...reports].sort((a,b)=>b.date.localeCompare(a.date));

  const [selected, setSelected] = useState(null);
  if (selected) return <ReportDetailScreen report={selected} onBack={()=>setSelected(null)}/>;
  return (
    <div style={{fontFamily:"'Nunito','Segoe UI',sans-serif",backgroundColor:"#f0fdfa",minHeight:"100vh",color:C.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap'); *{box-sizing:border-box}`}</style>
      <div style={{backgroundColor:C.teal,padding:"18px 16px",color:"white",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:10,padding:"8px 12px",color:"white",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>
          <div>
            <div style={{fontWeight:900,fontSize:17}}>📋 Report History</div>
            <div style={{fontSize:11,opacity:0.75,fontWeight:700}}>{reports.length} report{reports.length!==1?"s":""} saved</div>
          </div>
          <button onClick={()=>downloadCSV(reports)} style={{marginLeft:"auto",backgroundColor:C.pink,border:"none",borderRadius:10,padding:"10px 16px",color:"white",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>⬇ Export CSV</button>
        </div>
      </div>

<div style={{padding:"14px 14px 40px"}}>
        {reports.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
            <div style={{fontSize:48,marginBottom:12}}>📭</div>
            <div style={{fontWeight:800,fontSize:17}}>No reports yet</div>
            <div style={{fontSize:14,marginTop:6}}>Submitted reports will appear here.</div>
          </div>
        ) : sorted.map((r,i)=>{
          const wAvg = (Object.values(r.wheel).reduce((a,b)=>a+b,0)/10).toFixed(1);
          return (
            <div key={i} style={{backgroundColor:"white",borderRadius:16,padding:"16px",marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,0.06)",cursor:"pointer",transition:"box-shadow 0.15s"}}
              onClick={()=>setSelected(r)}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 18px rgba(0,0,0,0.12)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 8px rgba(0,0,0,0.06)"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:900,fontSize:17}}>
                    {new Date(r.date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
                  </div>
                  <div style={{fontSize:13,color:C.muted,marginTop:2}}>
                    {r.staff.map(s=>s.hours>0?`${s.name} (${s.hours}h)`:s.name).join(", ")||"No staff recorded"}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0,marginLeft:10}}>
                  <div style={{backgroundColor:"#f0fdf4",borderRadius:10,padding:"6px 10px",textAlign:"center"}}>
                    <div style={{fontWeight:900,fontSize:18,color:"#16a34a"}}>{wAvg}</div>
                    <div style={{fontSize:9,color:C.muted,fontWeight:700}}>WHEEL</div>
                  </div>
                  <div style={{backgroundColor:"#f0fdfa",borderRadius:10,padding:"6px 10px",textAlign:"center"}}>
                    <div style={{fontWeight:900,fontSize:18,color:C.teal}}>{r.busyness.score}</div>
                    <div style={{fontSize:9,color:C.muted,fontWeight:700}}>BUSY</div>
                  </div>
                  <div style={{backgroundColor:"#fdf4ff",borderRadius:10,padding:"6px 10px",textAlign:"center"}}>
                    <div style={{fontWeight:900,fontSize:18,color:"#9333ea"}}>{r.totalHours}</div>
                    <div style={{fontSize:9,color:C.muted,fontWeight:700}}>HOURS</div>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {OPS_FIELDS.map(([key,label,emoji])=>(
                  <span key={key} style={{fontSize:12,backgroundColor:"#f8fafc",borderRadius:8,padding:"4px 8px",fontWeight:700,color:C.muted}}>
                    {emoji} {r.operations[key]??0}
                  </span>
                ))}
              </div>
              {r.notes&&<div style={{marginTop:10,fontSize:13,color:C.muted,fontStyle:"italic",borderTop:`1px solid ${C.border}`,paddingTop:8}}>"{r.notes}"</div>}
              <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={e=>{e.stopPropagation();onEdit(r);}} style={{backgroundColor:"#f0fdfa",border:`1.5px solid #14b8a6`,borderRadius:8,padding:"7px 14px",color:"#0f766e",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>
                <span style={{fontSize:12,fontWeight:800,color:C.pink,display:"flex",alignItems:"center",gap:4}}>📄 Tap to view report →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const today = new Date().toISOString().split("T")[0];
  const [view, setView] = useState("form");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reports, setReports] = useState([]);
  const [lastReport, setLastReport] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [loadingReports, setLoadingReports] = useState(true);

  const [date, setDate] = useState(today);
  const [staff, setStaff] = useState([{name:"",mood:1,hours:""}]);
  const [wheel, setWheel] = useState(Object.fromEntries(WHEEL_CATS.map(c=>[c.key,7])));
  const [busyness, setBusyness] = useState(5);
  const [ops, setOps] = useState(EMPTY_OPS);
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(()=>{
    (async()=>{
      try {
        const result = await _storage.list("report:");
        if (result?.keys?.length) {
          const loaded = await Promise.all(result.keys.map(async key=>{
            try { const r=await _storage.get(key); return r?{...JSON.parse(r.value),_storageKey:key}:null; } catch{return null;}
          }));
          setReports(loaded.filter(Boolean));
        }
      } catch(e){console.error("Load error",e);}
      finally{setLoadingReports(false);}
    })();
  },[]);

  const totalHours = useMemo(()=>staff.reduce((s,m)=>s+(parseFloat(m.hours)||0),0),[staff]);
  const addStaff = ()=>{setStaff(p=>[...p,{name:"",mood:1,hours:""}]);setValidationError("");};
  const removeStaff = idx=>setStaff(p=>p.filter((_,i)=>i!==idx));
  const updateStaff = (idx,field,val)=>{setStaff(p=>p.map((s,i)=>i===idx?{...s,[field]:val}:s));setValidationError("");};

  const validate = (s) => {
    if (s === 1) {
      const named = staff.filter(m => m.name.trim());
      if (named.length === 0) return "Please add at least one team member.";
      for (const m of named) {
        if (m.hours === "" || m.hours === null) return `Please enter hours for ${m.name.trim()}.`;
      }
    }
    if (s === 3) {
      for (const [key, label] of OPS_FIELDS) {
        if (ops[key] === "") return `Please enter a number for "${label}" (use 0 if none).`;
      }
    }
    return "";
  };

  const handleNext = () => {
    const err = validate(step);
    if (err) { setValidationError(err); return; }
    setValidationError("");
    setStep(s => s + 1);
  };

  const handleSubmit = async()=>{
    const err = validate(3);
    if (err) { setValidationError(err); return; }
    setValidationError("");
    setSubmitting(true);
    const report = {
      date,
      staff: staff.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),mood:MOOD_LABELS[s.mood],hours:parseFloat(s.hours)||0})),
      totalHours,
      wheel: Object.fromEntries(WHEEL_CATS.map(c=>[c.key,wheel[c.key]])),
      busyness:{score:busyness,label:BUSYNESS_LABELS[busyness]},
      operations: Object.fromEntries(OPS_FIELDS.map(([key])=>[key,parseInt(ops[key])||0])),
      notes,
      submittedAt: new Date().toISOString(),
    };
    try {
      const key = editingKey || `report:${date}-${Date.now()}`;
      const reportWithKey = {...report, _storageKey: key};
      await _storage.set(key, JSON.stringify(reportWithKey));
      setReports(prev => editingKey
        ? prev.map(r => r._storageKey === editingKey ? reportWithKey : r)
        : [...prev, reportWithKey]
      );
      setLastReport(reportWithKey);
      setEditingKey(null);
      setSubmitted(true);
    } catch(e){alert("Save failed: "+e.message);}
    finally{setSubmitting(false);}
  };

  const reset = ()=>{
    setSubmitted(false); setStep(1); setDate(today); setLastReport(null); setEditingKey(null);
    setStaff([{name:"",mood:1,hours:""}]);
    setWheel(Object.fromEntries(WHEEL_CATS.map(c=>[c.key,7])));
    setBusyness(5); setOps(EMPTY_OPS); setNotes("");
  };

  const startEdit = (r) => {
    setEditingKey(r._storageKey);
    setDate(r.date);
    setStaff(r.staff.map(s=>({name:s.name,mood:MOOD_LABELS.indexOf(s.mood),hours:String(s.hours)})));
    setWheel(r.wheel);
    setBusyness(r.busyness.score);
    setOps(Object.fromEntries(OPS_FIELDS.map(([key])=>[key,String(r.operations[key]??0)])));
    setNotes(r.notes||"");
    setStep(1);
    setSubmitted(false);
    setValidationError("");
    setView("form");
  };

  if (view==="history") return <HistoryScreen reports={reports} onBack={()=>setView("form")} onEdit={startEdit}/>;
  if (view==="detail" && lastReport) return <ReportDetailScreen report={lastReport} onBack={()=>{setView("form");setSubmitted(true);}}/>;

  const C={teal:"#0f766e",tealMid:"#14b8a6",tealLight:"#ccfbf1",pink:"#E3A825",bg:"#f0fdfa",card:"#ffffff",text:"#0f172a",muted:"#64748b",border:"#e2e8f0"};
  const card={backgroundColor:C.card,borderRadius:16,padding:"18px 16px",boxShadow:"0 1px 8px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.03)",marginBottom:12};
  const inp={border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:16,fontFamily:"inherit",width:"100%",outline:"none",boxSizing:"border-box",backgroundColor:"white",color:C.text};
  const pct=step===1?33:step===2?66:100;

  if (submitted) return (
    <div style={{fontFamily:"'Nunito','Segoe UI',sans-serif",backgroundColor:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap'); *{box-sizing:border-box}`}</style>
      <div style={{textAlign:"center",maxWidth:380,width:"100%"}}>
        <div style={{fontSize:72,marginBottom:12}}>🐾</div>
        <h1 style={{color:C.teal,fontWeight:900,fontSize:26,margin:"0 0 8px"}}>Report Saved!</h1>
        <p style={{color:C.muted,fontSize:15,marginBottom:24}}>
          {new Date(date+"T00:00:00").toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long"})}'s report is saved. {reports.length} report{reports.length!==1?"s":""} in history.
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {lastReport&&<button onClick={()=>setView("detail")} style={{backgroundColor:C.pink,color:"white",border:"none",borderRadius:12,padding:14,fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>📲 Screenshot Format for Google Chat</button>}
          <button onClick={reset} style={{backgroundColor:C.teal,color:"white",border:"none",borderRadius:12,padding:14,fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Submit Another Report</button>
          <button onClick={()=>setView("history")} style={{backgroundColor:"white",color:C.teal,border:`2px solid ${C.teal}`,borderRadius:12,padding:14,fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>📋 View History & Export CSV</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"'Nunito','Segoe UI',sans-serif",backgroundColor:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        input[type=range]{-webkit-appearance:none;width:100%;height:8px;border-radius:4px;background:#e2e8f0;outline:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#14b8a6;cursor:pointer;box-shadow:0 2px 8px rgba(20,184,166,0.5)}
        input[type=number]{-moz-appearance:textfield}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        button{touch-action:manipulation}
      `}</style>

      {/* HEADER */}
      <div style={{backgroundColor:C.teal,padding:"18px 16px 14px",color:"white",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{fontSize:26}}>🐾</div>
          <div>
            <div style={{fontWeight:900,fontSize:17,letterSpacing:"0.5px"}}>PADDINGTON PUPS</div>
            <div style={{fontSize:11,opacity:0.75,fontWeight:700,letterSpacing:"1px"}}>{editingKey?"✏️ EDITING REPORT":"TEAM WEATHER REPORT"}</div>
          </div>
          <button onClick={()=>setView("history")} style={{marginLeft:"auto",backgroundColor:"rgba(255,255,255,0.18)",border:"none",borderRadius:10,padding:"7px 12px",color:"white",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            📋 {loadingReports?"...":reports.length}
          </button>
        </div>
        <div style={{backgroundColor:"rgba(255,255,255,0.2)",borderRadius:99,height:6,overflow:"hidden"}}>
          <div style={{backgroundColor:C.pink,height:"100%",width:`${pct}%`,borderRadius:99,transition:"width 0.4s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:11,fontWeight:700}}>
          {["👥 TEAM","🎡 WHEEL","📊 OPS"].map((l,i)=><span key={i} style={{opacity:step>=i+1?1:0.45}}>{l}</span>)}
        </div>
      </div>

      <div style={{padding:"14px 14px 100px"}}>

        {/* STEP 1 */}
        {step===1&&(
          <div>
            <div style={card}>
              <label style={{fontWeight:800,fontSize:13,color:C.muted,display:"block",marginBottom:8,letterSpacing:"0.5px"}}>📅 DATE</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
            </div>
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontWeight:900,fontSize:17}}>👥 Team Today</div>
                <div style={{backgroundColor:C.tealLight,color:C.teal,borderRadius:20,padding:"5px 13px",fontWeight:800,fontSize:14}}>{totalHours}h total</div>
              </div>
              {staff.map((s,i)=>(
                <div key={i} style={{padding:"12px 0",borderBottom:i<staff.length-1?`1px solid ${C.border}`:"none"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                    <input type="text" placeholder={`Team member ${i+1}`} value={s.name} onChange={e=>updateStaff(i,"name",e.target.value)} style={{...inp,flex:1,fontWeight:700}}/>
                    {staff.length>1&&<button onClick={()=>removeStaff(i)} style={{width:36,height:36,flexShrink:0,borderRadius:10,border:"none",backgroundColor:"#fef2f2",color:"#ef4444",fontSize:16,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>✕</button>}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{display:"flex",gap:4,flex:1}}>
                      {MOODS.map((m,mi)=>(
                        <button key={mi} onClick={()=>updateStaff(i,"mood",mi)} style={{flex:1,padding:"7px 0",borderRadius:8,border:"2px solid",borderColor:s.mood===mi?C.tealMid:C.border,backgroundColor:s.mood===mi?C.tealLight:"white",fontSize:17,cursor:"pointer",fontFamily:"inherit",transition:"all 0.12s"}}>{m}</button>
                      ))}
                    </div>
                    <input type="number" min="0" max="24" step="0.5" placeholder="hrs" value={s.hours} onChange={e=>updateStaff(i,"hours",e.target.value)} onWheel={e=>e.target.blur()} style={{...inp,width:72,textAlign:"center",padding:"10px 6px",fontSize:16,borderColor:s.name.trim()&&s.hours===""?"#fca5a5":C.border}}/>
                  </div>
                </div>
              ))}
              <button onClick={addStaff} style={{width:"100%",marginTop:12,padding:12,borderRadius:12,border:`2px dashed ${C.tealMid}`,backgroundColor:C.tealLight,color:C.teal,fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>+ Add Person</button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div>
            <div style={{...card,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:17,marginBottom:14}}>🎡 Live Preview</div>
              <RadarChart scores={wheel}/>
              <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
                {WHEEL_CATS.map(cat=>(
                  <span key={cat.key} style={{fontSize:11,backgroundColor:"#f1f5f9",borderRadius:6,padding:"3px 7px",color:C.muted,fontWeight:700}}>{cat.emoji} {wheel[cat.key]}</span>
                ))}
              </div>
            </div>
            {WHEEL_CATS.map(cat=>(
              <div key={cat.key} style={card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:900,fontSize:16}}>{cat.emoji} {cat.label}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:2}}>{cat.desc}</div>
                  </div>
                  <div style={{backgroundColor:C.teal,color:"white",borderRadius:12,padding:"6px 12px",minWidth:56,textAlign:"center",flexShrink:0,marginLeft:12}}>
                    <div style={{fontWeight:900,fontSize:20,lineHeight:1}}>{wheel[cat.key]}</div>
                    <div style={{fontSize:9,fontWeight:700,opacity:0.8,marginTop:2}}>{SCORE_LABELS[wheel[cat.key]]}</div>
                  </div>
                </div>
                <ScorePicker value={wheel[cat.key]} onChange={v=>setWheel(p=>({...p,[cat.key]:v}))}/>
              </div>
            ))}
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&(
          <div>
            <div style={card}>
              <div style={{fontWeight:900,fontSize:17,marginBottom:4}}>📈 Level Of Busy</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,fontWeight:700,marginBottom:10}}>
                <span>Very Quiet &amp; Slow</span><span>Chaotic Madness</span>
              </div>
              <input type="range" min="1" max="10" value={busyness} onChange={e=>setBusyness(parseInt(e.target.value))} style={{width:"100%"}}/>
              <div style={{textAlign:"center",marginTop:10}}>
                <span style={{fontWeight:900,fontSize:28,color:C.teal}}>{busyness}</span>
                <span style={{fontSize:16,fontWeight:700,color:C.muted,marginLeft:8}}>— {BUSYNESS_LABELS[busyness]}</span>
              </div>
            </div>
            <div style={card}>
              <div style={{fontWeight:900,fontSize:17,marginBottom:16}}>🐶 Numbers</div>
              {OPS_FIELDS.map(([key,label,emoji],idx)=>(
                <div key={key} style={{display:"flex",alignItems:"center",gap:12,paddingBottom:12,marginBottom:12,borderBottom:idx<OPS_FIELDS.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:22,flexShrink:0,width:30,textAlign:"center"}}>{emoji}</span>
                  <div style={{flex:1,fontWeight:700,fontSize:14}}>{label}</div>
                  <input type="number" min="0" value={ops[key]} onChange={e=>setOps(p=>({...p,[key]:e.target.value}))} style={{...inp,width:72,textAlign:"center",padding:"10px 6px"}}/>
                </div>
              ))}
            </div>
            <div style={card}>
              <label style={{fontWeight:900,fontSize:16,display:"block",marginBottom:10}}>📝 Notes</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Please write detailed notes about the day" rows={4} style={{...inp,resize:"vertical"}}/>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,backgroundColor:"white",borderTop:`1px solid ${C.border}`,padding:"10px 14px",boxShadow:"0 -4px 16px rgba(0,0,0,0.06)"}}>
        {validationError&&(
          <div style={{backgroundColor:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"9px 14px",marginBottom:8,fontSize:13,fontWeight:700,color:"#dc2626",display:"flex",alignItems:"center",gap:6}}>
            ⚠️ {validationError}
          </div>
        )}
        <div style={{display:"flex",gap:10}}>
        {step>1&&<button onClick={()=>{setStep(s=>s-1);setValidationError("");}} style={{flex:1,padding:14,borderRadius:12,border:`2px solid ${C.border}`,backgroundColor:"white",color:C.text,fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>← Back</button>}
        {step<3
          ?<button onClick={handleNext} style={{flex:2,padding:14,borderRadius:12,border:"none",backgroundColor:C.teal,color:"white",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>Next →</button>
          :<button onClick={handleSubmit} disabled={submitting} style={{flex:2,padding:14,borderRadius:12,border:"none",backgroundColor:submitting?"#94a3b8":C.pink,color:"white",fontSize:15,fontWeight:800,cursor:submitting?"not-allowed":"pointer",fontFamily:"inherit",transition:"background-color 0.2s"}}>
            {submitting?"⏳ Saving...":(editingKey?"💾 Save Changes":"✅ Submit Report")}
          </button>
        }
        </div>
      </div>
    </div>
  );
}
