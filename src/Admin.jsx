import React from 'react';
import { supabase } from './supabase';
import { LockKeyhole, LogOut, RefreshCw, Eye, EyeOff, ChartNoAxesColumn, ShieldCheck, ArrowLeft } from 'lucide-react';
import './admin.css';

const zero = {total_votes:0,total_participants:0,award_count:0};
export default function Admin(){
 const [session,setSession]=React.useState(null);
 const [checked,setChecked]=React.useState(false);
 const [authorized,setAuthorized]=React.useState(false);
 const [email,setEmail]=React.useState('');
 const [password,setPassword]=React.useState('');
 const [error,setError]=React.useState('');
 const [busy,setBusy]=React.useState(false);
 const [settings,setSettings]=React.useState({voting_open:false,results_published:false});
 const [summary,setSummary]=React.useState(zero);
 const [results,setResults]=React.useState([]);
 const [showResults,setShowResults]=React.useState(false);
 React.useEffect(()=>{
   supabase.auth.getSession().then(({data})=>{setSession(data.session);setChecked(true)});
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);setAuthorized(false);});
   return ()=>subscription.unsubscribe();
 },[]);
 React.useEffect(()=>{
   if(!session){setAuthorized(false);return}
   let active=true;
   supabase.from('sca_admins').select('user_id').eq('user_id',session.user.id).maybeSingle().then(({data,error})=>{
     if(active){setAuthorized(Boolean(data)&&!error);setChecked(true);}
   });
   return ()=>{active=false};
 },[session?.user?.id]);
 const refresh=React.useCallback(async()=>{
   if(!authorized)return;
   const [s,m,r]=await Promise.all([
     supabase.from('sca_settings').select('voting_open,results_published').eq('id',1).single(),
     supabase.rpc('sca_admin_vote_summary'),
     supabase.rpc('sca_admin_vote_results')
   ]);
   if(s.error||m.error||r.error){setError('No se pudieron cargar todos los datos: '+(s.error||m.error||r.error).message);return}
   setSettings(s.data);
   setSummary(m.data?.[0]||zero);
   setResults(r.data||[]);
   setError('');
 },[authorized]);
 React.useEffect(()=>{if(authorized)refresh()},[authorized,refresh]);
 async function signIn(e){
   e.preventDefault();setBusy(true);setError('');
   const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
   if(error)setError('No se ha podido iniciar sesión. Comprueba el correo y la contraseña.');
   setBusy(false);
 }
 async function changeSetting(key,value){
   setBusy(true);setError('');
   const {error}=await supabase.from('sca_settings').update({[key]:value,updated_at:new Date().toISOString()}).eq('id',1);
   if(error)setError('No se pudo guardar: '+error.message);
   else await refresh();
   setBusy(false);
 }
 const totals=results.reduce((o,r)=>({...o,[r.award_id]:(o[r.award_id]||0)+Number(r.vote_count)}),{});
 const categories=Object.values(results.reduce((acc,r)=>{
   if(!acc[r.award_id])acc[r.award_id]={id:r.award_id,title:r.award_title,nominees:[]};
   acc[r.award_id].nominees.push(r);return acc;
 },{}));
 return <div className="admin-app"><header className="admin-header"><a href="/" className="admin-brand">SC <span>✦</span> AWARDS <small>ADMINISTRACIÓN</small></a><a href="/" className="admin-back"><ArrowLeft size={15}/> Volver a la web</a></header>
 {!checked?<div className="admin-center">Comprobando acceso…</div>:!session?<main className="admin-login"><LockKeyhole size={34} color="#c9aa75"/><span className="admin-eyebrow">ACCESO RESTRINGIDO</span><h1>Panel de administración</h1><p>Solo para la organización de Santa Cecilia Awards.</p><form onSubmit={signIn}><label>Correo del administrador<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Correo electrónico"/></label><label>Contraseña<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña"/></label><button className="admin-primary" disabled={busy}>{busy?'Entrando…':'Acceder al panel'}</button></form>{error&&<p className="admin-error" role="alert">{error}</p>}</main>:!authorized?<main className="admin-login"><ShieldCheck size={36}/><h1>Acceso no autorizado</h1><p>Tu cuenta ha iniciado sesión, pero todavía no está registrada como administradora de la gala.</p><button className="admin-primary" onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button></main>:<main className="admin-dashboard"><div className="admin-head"><div><span className="admin-eyebrow">SANTA CECILIA AWARDS · 2026</span><h1>Panel de control</h1><p>Gestión de votaciones y escrutinio privado.</p></div><div className="admin-actions"><button onClick={refresh}><RefreshCw size={16}/> Actualizar</button><button onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Salir</button></div></div>
 {error&&<p className="admin-error" role="alert">{error}</p>}
 <div className="admin-metrics"><article><span>Votos recibidos</span><strong>{summary.total_votes}</strong><small>Elecciones por categoría</small></article><article><span>Participación</span><strong>{summary.total_participants}</strong><small>Papeletas identificadas por el modelo actual</small></article><article><span>Categorías</span><strong>{summary.award_count}</strong><small>Premios registrados</small></article></div>
 <div className="admin-panels"><section className="admin-panel"><span className="admin-eyebrow">CONTROL DE LA GALA</span><h2>Votaciones</h2><p>Abre o cierra la recepción de votos cuando lo decida la organización.</p><div className="admin-setting"><div><b>{settings.voting_open?'Votaciones abiertas':'Votaciones cerradas'}</b><small>{settings.voting_open?'La base de datos permite recibir votos válidos.':'No se aceptan votos actualmente.'}</small></div><button disabled={busy} className={settings.voting_open?'admin-danger':'admin-primary'} onClick={()=>{if(window.confirm(settings.voting_open?'¿Cerrar las votaciones?':'¿Abrir las votaciones? Confirma que el sistema de votación pública ya está preparado.'))changeSetting('voting_open',!settings.voting_open)}}>{settings.voting_open?'Cerrar votación':'Abrir votación'}</button></div><div className="admin-notice"><LockKeyhole size={17}/> La interfaz para emitir votos anónimos está pendiente de implementación. Mantén las votaciones cerradas hasta probarla.</div></section>
 <section className="admin-panel"><span className="admin-eyebrow">PUBLICACIÓN DE RESULTADOS</span><h2>Ganadores</h2><p>Los resultados solo se mostrarán públicamente tras completar la pantalla de revelación de la gala.</p><div className="admin-setting"><div><b>{settings.results_published?'Revelación autorizada':'Resultados ocultos'}</b><small>Este control no afecta a las consultas privadas del panel.</small></div><button disabled={busy} onClick={()=>{if(window.confirm('¿Cambiar el permiso de publicación de resultados?'))changeSetting('results_published',!settings.results_published)}}>{settings.results_published?'Ocultar resultados':'Autorizar revelación'}</button></div></section></div>
 <section className="admin-panel admin-results"><div className="admin-results-title"><div><span className="admin-eyebrow">ESCRUTINIO PRIVADO</span><h2>Resultados por premio</h2></div><button onClick={()=>setShowResults(v=>!v)}>{showResults?<EyeOff size={16}/>:<Eye size={16}/>} {showResults?'Ocultar cifras':'Ver cifras'}</button></div>{!showResults?<div className="admin-hidden"><EyeOff size={26}/> Los resultados están ocultos en pantalla. Pulsa «Ver cifras» para consultarlos.</div>:categories.length===0?<p>No hay candidatos registrados todavía.</p>:categories.map(c=><div className="admin-category" key={c.id}><h3>{c.title} <small>{totals[c.id]||0} votos</small></h3>{c.nominees.map(n=><div className="admin-vote" key={n.nominee_id}><div><span>{n.nominee_name}</span><b>{n.vote_count} votos · {totals[c.id]?Math.round(Number(n.vote_count)*100/totals[c.id]):0}%</b></div><div className="admin-bar"><div style={{width:(totals[c.id]?Number(n.vote_count)*100/totals[c.id]:0)+'%'}}/></div></div>)}</div>)}</section>
 </main>}</div>
}
