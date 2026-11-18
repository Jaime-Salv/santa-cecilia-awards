import React from 'react';
import { Camera, Award, Check, UploadCloud, Save } from 'lucide-react';
import { supabase } from './supabase';
import './director-winner.css';

export default function DirectorWinnerAdmin(){
 const [name,setName]=React.useState('');
 const [photo,setPhoto]=React.useState(null);
 const [path,setPath]=React.useState(null);
 const [file,setFile]=React.useState(null);
 const [busy,setBusy]=React.useState(false);
 const [status,setStatus]=React.useState('');
 const [confirmed,setConfirmed]=React.useState(false);
 React.useEffect(()=>{
  let live=true;
  supabase.from('sca_director_award').select('winner_name,photo_url,storage_path').eq('id',1).maybeSingle().then(({data,error})=>{
   if(!live)return;
   if(error){setStatus('No se pudo cargar el ganador: '+error.message);return}
   if(data){setName(data.winner_name);setPhoto(data.photo_url);setPath(data.storage_path);setConfirmed(true)}
  });
  return()=>{live=false}
 },[]);
 const localPreview=React.useMemo(()=>file?URL.createObjectURL(file):null,[file]);
 React.useEffect(()=>()=>{if(localPreview)URL.revokeObjectURL(localPreview)},[localPreview]);
 function selectFile(f){
  if(!f)return;
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)){setStatus('Solo se admiten JPG, PNG y WebP.');return}
  if(f.size>10*1024*1024){setStatus('La fotografía debe ocupar menos de 10 MB.');return}
  setFile(f);setStatus('Fotografía preparada para guardar.');
 }
 async function save(){
  const clean=name.trim();
  if(!clean){setStatus('Introduce primero el nombre del ganador.');return}
  if(!window.confirm('¿Guardar a «'+clean+'» como ganador oficial del Guante de Mickey? Podrás corregirlo antes o después de publicar los resultados.'))return;
  setBusy(true);setStatus('');
  let url=photo,storagePath=path,uploadedNew=null;
  try{
   if(file){
    const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
    uploadedNew='2026/'+crypto.randomUUID()+'.'+ext;
    const upload=await supabase.storage.from('sca-director-winner').upload(uploadedNew,file,{contentType:file.type,upsert:false});
    if(upload.error)throw upload.error;
    storagePath=uploadedNew;
    url=supabase.storage.from('sca-director-winner').getPublicUrl(uploadedNew).data.publicUrl;
   }
   const {error}=await supabase.from('sca_director_award').upsert({id:1,winner_name:clean,photo_url:url||null,storage_path:storagePath||null,updated_at:new Date().toISOString()},{onConflict:'id'});
   if(error){
    if(uploadedNew)await supabase.storage.from('sca-director-winner').remove([uploadedNew]);
    throw error;
   }
   setPhoto(url);setPath(storagePath);setFile(null);setConfirmed(true);
   setStatus('Ganador guardado correctamente. Solo será visible públicamente cuando reveles los resultados.');
  }catch(e){setStatus('No se pudo guardar: '+(e.message||'error desconocido'))}
  finally{setBusy(false)}
 }
 return <section className="admin-panel director-winner-admin">
   <span className="admin-eyebrow">ELECCIÓN EXCLUSIVA DEL DIRECTOR</span>
   <h2>Ganador del Guante de Mickey</h2>
   <p>Cuando el director anuncie el nombre, escríbelo aquí y hazle una fotografía con el móvil. No hay nominados ni votación para este premio. Su identidad permanecerá oculta hasta que publiques los resultados de la gala.</p>
   <div className="director-winner-form">
     <div className="director-winner-preview">
       {localPreview||photo?<img src={localPreview||photo} alt="Retrato del ganador del Guante de Mickey"/>:<div><Camera size={38} strokeWidth={1.1}/><span>FOTOGRAFÍA DEL GANADOR</span></div>}
     </div>
     <div className="director-winner-fields">
       <label>Nombre del ganador
        <input value={name} maxLength={160} onChange={e=>{setName(e.target.value);setConfirmed(false)}} placeholder="Nombre y apellidos"/>
       </label>
       <label className="director-winner-upload"><UploadCloud size={19}/>{file?'Cambiar fotografía':'Hacer foto o seleccionar archivo'}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e=>{selectFile(e.target.files?.[0]);e.target.value=''}}/>
       </label>
       <span className="director-winner-help">En móvil se abrirá la cámara si el navegador lo permite. También puedes elegir una foto de la galería. Máximo 10 MB.</span>
       <button type="button" className="admin-primary" disabled={busy||!name.trim()} onClick={save}><Save size={17}/>{busy?'Guardando…':'Guardar ganador oficial'}</button>
       {confirmed&&<p className="director-winner-confirmed"><Check size={16}/> Ganador registrado en la base de datos.</p>}
       {status&&<p className="director-winner-status" role="status">{status}</p>}
     </div>
   </div>
 </section>;
}
