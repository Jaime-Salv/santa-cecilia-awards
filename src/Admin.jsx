import React from 'react';
import { supabase } from './supabase';
import { LockKeyhole, LogOut, RefreshCw, Eye, EyeOff, ChartNoAxesColumn, ShieldCheck, ArrowLeft } from 'lucide-react';
import './admin.css';
import YearGalleryAdmin from './YearGalleryAdmin';

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
 const [awards,setAwards]=React.useState([]);
 const [nominees,setNominees]=React.useState([]);
 const [photoUploading,setPhotoUploading]=React.useState(null);
 const [photoStatus,setPhotoStatus]=React.useState('');
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
   const [s,m,r,a,n]=await Promise.all([
     supabase.from('sca_settings').select('voting_open,results_published').eq('id',1).single(),
     supabase.rpc('sca_admin_vote_summary'),
     supabase.rpc('sca_admin_vote_results'),
     supabase.from('sca_awards').select('id,title,slug,image_url,published').order('display_order'),
     supabase.from('sca_nominees').select('id,award_id,name,photo_url,video_url,published,display_order').order('display_order')
   ]);
   if(s.error||m.error||r.error||a.error||n.error){setError('No se pudieron cargar todos los datos: '+(s.error||m.error||r.error||a.error||n.error).message);return}
   setSettings(s.data);
   setSummary(m.data?.[0]||zero);
   setResults(r.data||[]);
   setAwards(a.data||[]);
   setNominees(n.data||[]);
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

 async function uploadAwardPhoto(award,file){
   if(!file)return;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
     setPhotoStatus('Formato no admitido. Selecciona una imagen JPG, PNG o WebP.');
     return;
   }
   if(file.size>8*1024*1024){setPhotoStatus('La imagen no puede superar 8 MB.');return}
   setPhotoUploading(award.id);setPhotoStatus('Subiendo imagen…');
   try{
     const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
     const path=award.slug+'/'+crypto.randomUUID()+'.'+ext;
     const {error:uploadError}=await supabase.storage.from('sca-awards').upload(path,file,{contentType:file.type,upsert:false});
     if(uploadError)throw uploadError;
     const {data}=supabase.storage.from('sca-awards').getPublicUrl(path);
     const {error:updateError}=await supabase.from('sca_awards').update({image_url:data.publicUrl}).eq('id',award.id);
     if(updateError)throw updateError;
     setPhotoStatus('Fotografía guardada. Ya está disponible en la web pública.');
     await refresh();
   }catch(err){
     setPhotoStatus('Error al guardar la fotografía: '+(err.message||'error desconocido'));
   }finally{setPhotoUploading(null)}
 }

 async function updateNominee(nominee, changes){
   setBusy(true);
   setPhotoStatus('Guardando candidato…');
   const {error}=await supabase.from('sca_nominees').update(changes).eq('id',nominee.id);
   if(error)setPhotoStatus('Error al guardar: '+error.message);
   else {setPhotoStatus('Candidato actualizado correctamente.');await refresh();}
   setBusy(false);
 }
 async function uploadNomineePhoto(nominee,file){
   if(!file)return;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setPhotoStatus('Imagen no admitida. Usa JPG, PNG o WebP.');return;}
   if(file.size>8*1024*1024){setPhotoStatus('Máximo 8 MB por fotografía.');return;}
   setPhotoUploading(nominee.id);
   setPhotoStatus('Subiendo fotografía del nominado…');
   try{
     const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
     const path='nominees/'+nominee.id+'/'+crypto.randomUUID()+'.'+ext;
     const {error}=await supabase.storage.from('sca-awards').upload(path,file,{contentType:file.type,upsert:false});
     if(error)throw error;
     const {data}=supabase.storage.from('sca-awards').getPublicUrl(path);
     const {error:saveError}=await supabase.from('sca_nominees').update({photo_url:data.publicUrl}).eq('id',nominee.id);
     if(saveError)throw saveError;
     setPhotoStatus('Foto del nominado guardada.');
     await refresh();
   }catch(e){setPhotoStatus('No se pudo subir la foto: '+(e.message||'error'));}
   finally{setPhotoUploading(null)}
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

 <YearGalleryAdmin/>
 <section className="admin-panel admin-photos">
   <span className="admin-eyebrow">IMÁGENES OFICIALES</span>
   <h2>Fotografías de los premios</h2>
   <p>Sube las fotos de los trofeos directamente desde aquí. La portada y las tarjetas de premios se actualizarán automáticamente. No necesitas modificar GitHub.</p>
   <div className="admin-photo-grid">{awards.map(award=><article className="admin-photo-card" key={award.id}>
     <div className="admin-photo-preview">{award.image_url?<img src={award.image_url} alt={award.title}/>:<span>Sin fotografía</span>}</div>
     <div className="admin-photo-content"><strong>{award.title}</strong><small>{award.image_url?'Imagen configurada':'Pendiente de imagen oficial'}</small>
       <label className="admin-photo-upload">{photoUploading===award.id?'Subiendo…':'Seleccionar fotografía'}
         <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(photoUploading)} onChange={e=>{const file=e.target.files?.[0];e.target.value='';uploadAwardPhoto(award,file)}}/>
       </label>
     </div>
   </article>)}</div>
   {photoStatus&&<p className="admin-photo-status" role="status">{photoStatus}</p>}
 </section>

 <section className="admin-panel admin-photos">
   <span className="admin-eyebrow">CANDIDATOS DE LA GALA</span>
   <h2>Revisar nominados</h2>
   <p>Las nominaciones del documento original están en borrador. Confirma cada una antes de hacerla visible públicamente. También puedes añadir su fotografía y enlace de vídeo.</p>
   <div className="admin-nominee-list">{awards.filter(a=>nominees.some(n=>n.award_id===a.id)).map(a=><details key={a.id} className="admin-nominee-group">
     <summary><span>{a.title}</span><small>{nominees.filter(n=>n.award_id===a.id&&n.published).length} / {nominees.filter(n=>n.award_id===a.id).length} publicados</small></summary>
     <div className="admin-nominee-items">{nominees.filter(n=>n.award_id===a.id).map(n=><article className="admin-nominee-item" key={n.id}>
       {n.photo_url?<img className="admin-nominee-thumb" src={n.photo_url} alt={n.name}/>:<div className="admin-nominee-thumb empty">Sin foto</div>}
       <div className="admin-nominee-controls"><strong>{n.name}</strong><label className="admin-photo-upload">Subir foto
         <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(photoUploading)||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';uploadNomineePhoto(n,file)}}/>
       </label>
       <label className="admin-video-label">Vídeo (enlace)
         <input type="url" key={n.id+'-'+(n.video_url||'')} defaultValue={n.video_url||''} placeholder="https://…" onBlur={e=>{const value=e.target.value.trim();if(value!==(n.video_url||''))updateNominee(n,{video_url:value||null})}}/>
       </label></div>
       <button type="button" disabled={busy||Boolean(photoUploading)} className={n.published?'admin-danger':'admin-primary'} onClick={()=>updateNominee(n,{published:!n.published})}>{n.published?'Ocultar':'Publicar'}</button>
     </article>)}</div>
   </details>)}</div>
 </section>
 <section className="admin-panel admin-results"><div className="admin-results-title"><div><span className="admin-eyebrow">ESCRUTINIO PRIVADO</span><h2>Resultados por premio</h2></div><button onClick={()=>setShowResults(v=>!v)}>{showResults?<EyeOff size={16}/>:<Eye size={16}/>} {showResults?'Ocultar cifras':'Ver cifras'}</button></div>{!showResults?<div className="admin-hidden"><EyeOff size={26}/> Los resultados están ocultos en pantalla. Pulsa «Ver cifras» para consultarlos.</div>:categories.length===0?<p>No hay candidatos registrados todavía.</p>:categories.map(c=><div className="admin-category" key={c.id}><h3>{c.title} <small>{totals[c.id]||0} votos</small></h3>{c.nominees.map(n=><div className="admin-vote" key={n.nominee_id}><div><span>{n.nominee_name}</span><b>{n.vote_count} votos · {totals[c.id]?Math.round(Number(n.vote_count)*100/totals[c.id]):0}%</b></div><div className="admin-bar"><div style={{width:(totals[c.id]?Number(n.vote_count)*100/totals[c.id]:0)+'%'}}/></div></div>)}</div>)}</section>
 </main>}</div>
}
