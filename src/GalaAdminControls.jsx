import React from 'react';
import { LockKeyhole, UnlockKeyhole, Eye, EyeOff, Play, FlaskConical, CheckCircle, RefreshCw, PauseCircle, Trash2, Vote } from 'lucide-react';
import { supabase } from './supabase';
import './gala-admin.css';

const MAX=10;
const modes={inactive:'Sin comenzar',rehearsal:'SIMULACRO',live:'GALA REAL',finished:'Gala finalizada'};
export default function GalaAdminControls(){
 const [awards,setAwards]=React.useState([]);
 const [settings,setSettings]=React.useState(null);
 const [tallies,setTallies]=React.useState({live:[],rehearsal:[]});
 const [modeView,setModeView]=React.useState('live');
 const [busy,setBusy]=React.useState(false);
 const [error,setError]=React.useState('');
 const [notice,setNotice]=React.useState('');
 const [showResults,setShowResults]=React.useState(false);
 const refresh=React.useCallback(async()=>{
  const [s,a,l,r]=await Promise.all([
   supabase.from('sca_settings').select('gala_mode,voting_open,unlocked_order,results_published').eq('id',1).single(),
   supabase.from('sca_awards').select('id,title,slug,voting_order').not('voting_order','is',null).order('voting_order'),
   supabase.rpc('sca_gala_admin_results',{p_mode:'live'}),
   supabase.rpc('sca_gala_admin_results',{p_mode:'rehearsal'})
  ]);
  const e=s.error||a.error||l.error||r.error;
  if(e){setError('No se pudo cargar el control de gala: '+e.message);return}
  setSettings(s.data);setAwards(a.data||[]);setTallies({live:l.data||[],rehearsal:r.data||[]});setError('');
 },[]);
 React.useEffect(()=>{
  refresh();
  const timer=setInterval(()=>{if(!busy)refresh()},6000);
  return ()=>clearInterval(timer);
 },[refresh,busy]);

 async function change(changes,confirmation,success){
  if(confirmation&&!window.confirm(confirmation))return;
  setBusy(true);setError('');setNotice('');
  const {error:e}=await supabase.from('sca_settings').update({...changes,updated_at:new Date().toISOString()}).eq('id',1);
  if(e)setError('No se pudo guardar: '+e.message);
  else setNotice(success||'Control actualizado.');
  await refresh();setBusy(false);
 }
 async function resetTestVotes(){
  if(!window.confirm('¿Borrar TODOS los votos del simulacro? Los votos reales no se tocarán.'))return;
  setBusy(true);setError('');setNotice('');
  const {data,error:e}=await supabase.rpc('sca_gala_reset_rehearsal');
  if(e)setError(e.message);else setNotice('Simulacro reiniciado: '+data+' votos de prueba eliminados.');
  await refresh();setBusy(false);
 }
 const currentMode=settings?.gala_mode;
 const results=tallies[modeView]||[];
 const totalVotes=results.reduce((sum,row)=>sum+Number(row.vote_count),0);
 const totalByAward={};
 results.forEach(r=>{totalByAward[r.award_id]=(totalByAward[r.award_id]||0)+Number(r.vote_count)});
 const groups=awards.map(a=>({...a,nominees:results.filter(r=>r.award_id===a.id)}));
 return <section className="admin-panel gala-admin-controls" id="gala-admin-controls">
  <span className="admin-eyebrow">DIRECTOR DE CEREMONIA</span>
  <div className="gala-control-title"><div><h2>Control de la gala</h2><p>Abre los premios en orden mientras se anuncian en el proyector. Nadie puede avanzar hasta que habilites el siguiente.</p></div><button type="button" onClick={refresh} disabled={busy}><RefreshCw size={16}/> Actualizar</button></div>
  {!settings?<p>Consultando el estado de la gala…</p>:<>
   <div className="gala-overview"><div><span>ESTADO</span><strong>{modes[currentMode]}</strong></div><div><span>PREMIOS DESBLOQUEADOS</span><strong>{settings.unlocked_order} / {MAX}</strong></div><div><span>VOTACIÓN</span><strong>{settings.voting_open?'Abierta':'Cerrada'}</strong></div></div>
   <div className="gala-mode-buttons">
    {currentMode==='inactive'&&<>
     <button className="admin-primary" disabled={busy} onClick={()=>change({gala_mode:'rehearsal',voting_open:true,unlocked_order:0,results_published:false},'¿Iniciar un SIMULACRO? Los votos irán a una base separada y no contarán en la gala real.','Simulacro activado. Abre ahora el primer premio.')}><FlaskConical size={17}/> Iniciar simulacro</button>
     <button disabled={busy} onClick={()=>change({gala_mode:'live',voting_open:true,unlocked_order:0,results_published:false},'¿INICIAR LA GALA REAL? A partir de este momento se contabilizarán votos reales. Comprueba que has terminado el simulacro.','Gala real iniciada. Abre el primer premio cuando corresponda.')}><Play size={17}/> Preparar votación real</button>
    </>}
    {currentMode==='rehearsal'&&<>
     <button disabled={busy} onClick={resetTestVotes}><Trash2 size={16}/> Borrar votos de prueba</button>
     <button disabled={busy} onClick={()=>change({gala_mode:'inactive',voting_open:false,unlocked_order:0,results_published:false},'¿Terminar el simulacro y cerrar las votaciones de prueba?','Simulacro cerrado. Puedes iniciar uno nuevo o preparar la gala real.')}><PauseCircle size={16}/> Terminar simulacro</button>
    </>}
    {currentMode==='live'&&<>
     {settings.voting_open?<button disabled={busy} onClick={()=>change({voting_open:false},'¿Cerrar las votaciones reales? Los votos ya registrados se conservarán.','Votaciones reales cerradas. Puedes publicar los resultados cuando estés preparado.')}><PauseCircle size={17}/> Cerrar votaciones</button>:<>
      <button disabled={busy} onClick={()=>change({voting_open:true},'¿Reabrir las votaciones reales?','Votaciones reabiertas.')}><Play size={17}/> Reabrir votaciones</button>
      <button className="admin-primary" disabled={busy||settings.unlocked_order<MAX} onClick={()=>change({gala_mode:'finished',voting_open:false,results_published:true},'¿REVELAR LOS RESULTADOS REALES AL PÚBLICO? Se mostrarán los nominados con sus fotos y vídeos, y el escrutinio de la gala.','Resultados públicos: fotografías y recuentos revelados.')}><Eye size={17}/> Revelar resultados y fotografías</button>
     </>}
    </>}
    {currentMode==='finished'&&<button disabled={busy} onClick={()=>change({results_published:!settings.results_published},'¿Cambiar la visibilidad pública de los resultados?')}>{settings.results_published?<><EyeOff size={17}/> Ocultar resultados públicos</>:<><Eye size={17}/> Mostrar resultados públicos</>}</button>}
   </div>
   {currentMode==='rehearsal'&&<p className="gala-rehearsal-warning">Modo simulacro. Las votaciones se guardan separadas y no afectan a los resultados reales.</p>}
   {currentMode==='live'&&!settings.voting_open&&settings.unlocked_order<MAX&&<p className="gala-rehearsal-warning">Para revelar resultados deben haberse desbloqueado los diez premios. Puedes reabrir la votación y continuar cuando lo necesites.</p>}
   <div className="gala-round-title"><span>ACTIVAR CADA PREMIO</span><span>ORDEN DE LA CEREMONIA</span></div>
   <div className="gala-award-control-list">{awards.map(a=>{
     const opened=a.voting_order<=settings.unlocked_order;
     const next=a.voting_order===settings.unlocked_order+1;
     const liveMode=currentMode==='live'||currentMode==='rehearsal';
     const disabled=busy||!liveMode||!settings.voting_open||opened||!next;
     const count=(tallies[liveMode?currentMode:'live']||[]).filter(v=>v.award_id===a.id).reduce((sum,v)=>sum+Number(v.vote_count),0);
     return <div className={'gala-award-control '+(opened?'is-open':'')} key={a.id}>
      <span className="gala-award-index">{String(a.voting_order).padStart(2,'0')}</span>
      <div className="gala-award-name"><strong>{a.title}</strong><small>{opened?'DESBLOQUEADO':'BLOQUEADO'} · {count} votos registrados</small></div>
      <button type="button" className={opened?'gala-open-tag':next&&liveMode?'admin-primary':''} disabled={disabled} onClick={()=>change({unlocked_order:a.voting_order},'¿ACTIVAR «'+a.title+'»? Los asistentes podrán votar este premio y quienes hayan votado el anterior podrán avanzar.','Premio '+a.voting_order+' desbloqueado.')}>
       {opened?<><CheckCircle size={16}/> ABIERTO</>:<><LockKeyhole size={15}/> {next&&liveMode?'ACTIVAR':'BLOQUEADO'}</>}
      </button>
     </div>
   })}</div>
   <div className="gala-control-results">
    <div className="gala-control-title"><div><span className="admin-eyebrow">ESCRUTINIO PRIVADO</span><h2>Resultados y pruebas</h2></div><button type="button" onClick={()=>setShowResults(v=>!v)}>{showResults?<EyeOff size={16}/>:<Eye size={16}/>} {showResults?'Ocultar':'Consultar'}</button></div>
    {showResults&&<>
     <div className="gala-result-mode"><button type="button" className={modeView==='live'?'selected':''} onClick={()=>setModeView('live')}>Gala real</button><button type="button" className={modeView==='rehearsal'?'selected':''} onClick={()=>setModeView('rehearsal')}>Simulacro</button></div>
     <p className="gala-result-total">{totalVotes} votos contabilizados ({modeView==='live'?'reales':'de prueba'}).</p>
     {groups.map(a=><div className="gala-result-category" key={a.id}><h3>{a.title} <small>{totalByAward[a.id]||0} votos</small></h3>{a.nominees.map(n=><div key={n.nominee_id} className="gala-result-row"><span>{n.nominee_name}</span><strong>{n.vote_count} · {totalByAward[a.id]?Math.round(100*Number(n.vote_count)/totalByAward[a.id]):0}%</strong></div>)}</div>)}
    </>}
   </div>
  </>}
  {error&&<p className="admin-error" role="alert">{error}</p>}
  {notice&&<p className="gala-control-notice" role="status">{notice}</p>}
 </section>;
}
