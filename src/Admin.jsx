import React from 'react';
import { supabase } from './supabase';
import { LockKeyhole, LogOut, RefreshCw, Eye, EyeOff, ChartNoAxesColumn, ShieldCheck, ArrowLeft } from 'lucide-react';
import './admin.css';
import YearGalleryAdmin from './YearGalleryAdmin';
import NomineeMediaAdmin from './NomineeMediaAdmin';
import GalaAdminControls from './GalaAdminControls';

const zero = {total_votes:0,total_participants:0,award_count:0};
export default function Admin(){
 const [session,setSession]=React.useState(null);
 const [checked,setChecked]=React.useState(false);
 const [authorized,setAuthorized]=React.useState(false);
 const [email,setEmail]=React.useState('');
 const [password,setPassword]=React.useState('');
 const [error,setError]=React.useState('');
 const [busy,setBusy]=React.useState(false);
 const [awards,setAwards]=React.useState([]);
 const [nominees,setNominees]=React.useState([]);
 const [photoUploading,setPhotoUploading]=React.useState(null);
 const [photoStatus,setPhotoStatus]=React.useState('');
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
   const [a,n]=await Promise.all([
     supabase.from('sca_awards').select('id,title,slug,image_url,published').order('display_order'),
     supabase.from('sca_nominees').select('id,award_id,name,photo_url,video_url,published,display_order').order('display_order')
   ]);
   if(a.error||n.error){setError('No se pudieron cargar los premios y nominados: '+(a.error||n.error).message);return}
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
 async function uploadNomineeMedia(nominee,file){
  if(!file)return;
  const isVideo=file.type==='video/mp4';
  const types=['image/jpeg','image/png','image/webp','video/mp4'];
  if(!types.includes(file.type)){setPhotoStatus('Formato no admitido: usa JPG, PNG, WebP o MP4.');return}
  if(file.size>(isVideo?45:8)*1024*1024){setPhotoStatus('El archivo supera el límite: 8 MB para fotos o 45 MB para vídeos.');return}
  setPhotoUploading(nominee.id);
  setPhotoStatus('Subiendo '+(isVideo?'vídeo':'fotografía')+' de '+nominee.name+'…');
  try{
   const ext=isVideo?'mp4':file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
   const path='nominees/'+nominee.id+'/'+crypto.randomUUID()+'.'+ext;
   const {error:uploadError}=await supabase.storage.from('sca-nominee-media').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
   if(uploadError)throw uploadError;
   const {data}=supabase.storage.from('sca-nominee-media').getPublicUrl(path);
   const column=isVideo?'video_url':'photo_url';
   const {error:saveError}=await supabase.from('sca_nominees').update({[column]:data.publicUrl}).eq('id',nominee.id);
   if(saveError){
    await supabase.storage.from('sca-nominee-media').remove([path]);
    throw saveError;
   }
   await refresh();
   setPhotoStatus((isVideo?'Vídeo':'Fotografía')+' de '+nominee.name+' guardado correctamente. El nominado conserva su estado de publicación.');
  }catch(e){setPhotoStatus('Error al subir archivo: '+(e.message||'error desconocido'))}
  finally{setPhotoUploading(null)}
 }

 return <div className="admin-app"><header className="admin-header"><a href="/" className="admin-brand">SC <span>✦</span> AWARDS <small>ADMINISTRACIÓN</small></a><a href="/" className="admin-back"><ArrowLeft size={15}/> Volver a la web</a></header>
 {!checked?<div className="admin-center">Comprobando acceso…</div>:!session?<main className="admin-login"><LockKeyhole size={34} color="#c9aa75"/><span className="admin-eyebrow">ACCESO RESTRINGIDO</span><h1>Panel de administración</h1><p>Solo para la organización de Santa Cecilia Awards.</p><form onSubmit={signIn}><label>Correo del administrador<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Correo electrónico"/></label><label>Contraseña<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña"/></label><button className="admin-primary" disabled={busy}>{busy?'Entrando…':'Acceder al panel'}</button></form>{error&&<p className="admin-error" role="alert">{error}</p>}</main>:!authorized?<main className="admin-login"><ShieldCheck size={36}/><h1>Acceso no autorizado</h1><p>Tu cuenta ha iniciado sesión, pero todavía no está registrada como administradora de la gala.</p><button className="admin-primary" onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button></main>:<main className="admin-dashboard"><div className="admin-head"><div><span className="admin-eyebrow">SANTA CECILIA AWARDS · 2026</span><h1>Panel de control</h1><p>Gestión de votaciones y escrutinio privado.</p></div><div className="admin-actions"><button onClick={refresh}><RefreshCw size={16}/> Actualizar</button><button onClick={()=>supabase.auth.signOut()}><LogOut size={16}/> Salir</button></div></div>
 {error&&<p className="admin-error" role="alert">{error}</p>}
 <GalaAdminControls/>
 <YearGalleryAdmin/>
 <section className="admin-panel admin-photos">
   <span className="admin-eyebrow">IMÁGENES OFICIALES</span>
   <h2>Fotografías de los grandes premios</h2>
   <p>Sube las fotos de los trofeos directamente desde aquí. La portada y las tarjetas de premios se actualizarán automáticamente. No necesitas modificar GitHub.</p>
   <div className="admin-photo-grid">{awards.filter(award=>['guante-de-mickey','cachorro-del-ano'].includes(award.slug)).map(award=><article className="admin-photo-card" key={award.id}>
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
   <p>Los nombres definitivos ya están cargados. Arrastra fotos verticales o vídeos MP4 sobre cada nominado. Todo este material permanecerá oculto al público hasta que reveles los resultados al terminar la gala.</p>
   <div className="admin-nominee-list">{awards.filter(a=>nominees.some(n=>n.award_id===a.id)).map(a=><details key={a.id} className="admin-nominee-group">
     <summary><span>{a.title}</span><small>{nominees.filter(n=>n.award_id===a.id).length} nominados</small></summary>
     <div className="admin-nominee-items">{nominees.filter(n=>n.award_id===a.id).map(n=><article className="admin-nominee-item" key={n.id}>
       <div className="admin-nominee-controls"><strong>{n.name}</strong><NomineeMediaAdmin nominee={n} busy={busy||Boolean(photoUploading)} onUpload={uploadNomineeMedia} onSave={updateNominee}/></div>
     </article>)}</div>
   </details>)}</div>
 </section>
 </main>}</div>
}
