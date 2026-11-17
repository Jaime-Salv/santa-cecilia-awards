import React from 'react';
import { Images, UploadCloud, ArrowUp, ArrowDown, Trash2, Eye, EyeOff, RefreshCcw } from 'lucide-react';
import { supabase } from './supabase';
import './year-gallery-admin.css';

const BUCKET='sca-gallery';
const ALLOWED=['image/jpeg','image/png','image/webp'];
const MAX_BYTES=8*1024*1024;

function PhotoEditor({photo,index,total,busy,onSave,onMove,onRemove}){
 const [caption,setCaption]=React.useState(photo.caption||'');
 React.useEffect(()=>setCaption(photo.caption||''),[photo.caption]);
 return <div className="gallery-editor-photo">
  <img src={photo.image_url} alt={photo.caption||'Fotografía del año 2026'} loading="lazy"/>
  <div className="gallery-editor-fields">
   <span className="gallery-editor-pos">FOTO {String(index+1).padStart(2,'0')} / {String(total).padStart(2,'0')}</span>
   <label>Descripción o pie de foto
    <input type="text" maxLength={160} value={caption} placeholder="Ej.: Nuestra actuación en Sevilla" onChange={e=>setCaption(e.target.value)}/>
   </label>
   <div className="gallery-editor-buttons">
    <button disabled={busy||caption===(photo.caption||'')} type="button" onClick={()=>onSave(photo,{caption})}>Guardar texto</button>
    <button disabled={busy} type="button" onClick={()=>onSave(photo,{published:!photo.published})}>{photo.published?<><EyeOff size={14}/> Ocultar</>:<><Eye size={14}/> Publicar</>}</button>
    <button disabled={busy||index===0} type="button" onClick={()=>onMove(index,-1)} title="Mover antes" aria-label="Mover foto hacia la izquierda"><ArrowUp size={15}/></button>
    <button disabled={busy||index===total-1} type="button" onClick={()=>onMove(index,1)} title="Mover después" aria-label="Mover foto hacia la derecha"><ArrowDown size={15}/></button>
    <button disabled={busy} type="button" className="gallery-editor-remove" onClick={()=>onRemove(photo)}><Trash2 size={15}/> Eliminar</button>
   </div>
   <span className={photo.published?'gallery-editor-public':'gallery-editor-draft'}>{photo.published?'VISIBLE EN LA WEB':'OCULTA AL PÚBLICO'}</span>
  </div>
 </div>;
}

export default function YearGalleryAdmin(){
 const [photos,setPhotos]=React.useState([]);
 const [loading,setLoading]=React.useState(true);
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState('');
 const [uploadPublished,setUploadPublished]=React.useState(true);

 const reload=React.useCallback(async()=>{
  const {data,error}=await supabase.from('sca_year_photos').select('id,storage_path,image_url,caption,sort_order,published,created_at').order('sort_order').order('created_at');
  if(error)setMessage('No se pudo cargar la galería: '+error.message);
  else setPhotos(data||[]);
  setLoading(false);
 },[]);

 React.useEffect(()=>{reload()},[reload]);

 async function upload(event){
  const files=Array.from(event.target.files||[]);
  event.target.value='';
  if(!files.length)return;
  if(files.length>20){setMessage('Sube hasta 20 fotografías en cada tanda.');return;}
  setBusy(true);setMessage('Subiendo fotografías…');
  let nextOrder=photos.reduce((m,p)=>Math.max(m,p.sort_order),0)+10;
  let success=0,failed=[];
  for(const file of files){
   if(!ALLOWED.includes(file.type)||file.size>MAX_BYTES){failed.push(file.name+': formato no válido o tamaño superior a 8 MB');continue;}
   const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
   const path='2026/'+crypto.randomUUID()+'.'+ext;
   const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError){failed.push(file.name+': '+uploadError.message);continue;}
   const {data:urlData}=supabase.storage.from(BUCKET).getPublicUrl(path);
   const {error:dbError}=await supabase.from('sca_year_photos').insert({storage_path:path,image_url:urlData.publicUrl,caption:'',sort_order:nextOrder,published:uploadPublished});
   if(dbError){await supabase.storage.from(BUCKET).remove([path]);failed.push(file.name+': '+dbError.message);continue;}
   success++;nextOrder+=10;
  }
  await reload();
  setMessage(success+' fotografía(s) guardadas.'+(failed.length?' Problemas: '+failed.join('; '):''));
  setBusy(false);
 }
 async function save(photo,changes){
  setBusy(true);setMessage('');
  const {error}=await supabase.from('sca_year_photos').update(changes).eq('id',photo.id);
  if(error)setMessage('No se pudo guardar: '+error.message);else{await reload();setMessage('Cambios guardados.');}
  setBusy(false);
 }
 async function move(index,direction){
  const other=index+direction;
  if(other<0||other>=photos.length)return;
  setBusy(true);setMessage('');
  const current=photos[index],target=photos[other];
  const first=await supabase.from('sca_year_photos').update({sort_order:target.sort_order}).eq('id',current.id);
  if(first.error){setMessage('Error al ordenar: '+first.error.message);setBusy(false);return;}
  const second=await supabase.from('sca_year_photos').update({sort_order:current.sort_order}).eq('id',target.id);
  if(second.error)setMessage('No se pudo completar el cambio: '+second.error.message);
  else setMessage('Orden actualizado.');
  await reload();setBusy(false);
 }
 async function remove(photo){
  if(!window.confirm('¿Eliminar esta fotografía del carrusel? Esta operación no se puede deshacer.'))return;
  setBusy(true);setMessage('');
  const {error}=await supabase.from('sca_year_photos').delete().eq('id',photo.id);
  if(error){setMessage('No se pudo borrar: '+error.message);setBusy(false);return;}
  const {error:storageError}=await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  setMessage(storageError?'Fotografía retirada del carrusel, pero el archivo requiere limpieza: '+storageError.message:'Fotografía eliminada.');
  await reload();setBusy(false);
 }
 return <section className="admin-panel admin-gallery-section" id="admin-recuerdos">
  <div className="admin-gallery-header"><div><span className="admin-eyebrow">PORTADA · RECUERDOS DEL AÑO</span><h2>¿Cómo ha ido el 2026?</h2><p>Controla el carrusel horizontal de la página principal. Añade fotos, escribe pies de foto, cambia el orden y oculta o publica imágenes.</p></div><button type="button" disabled={busy} onClick={reload}><RefreshCcw size={16}/> Actualizar</button></div>
  <div className="gallery-editor-upload">
   <UploadCloud size={30} color="#d2b075"/>
   <strong>Subir fotografías</strong><span>JPG, PNG o WebP. Hasta 8 MB por imagen, 20 por tanda.</span>
   <label className="gallery-editor-publish"><input type="checkbox" checked={uploadPublished} onChange={e=>setUploadPublished(e.target.checked)}/> Publicar automáticamente las fotos nuevas</label>
   <label className="admin-photo-upload gallery-upload-button">{busy?'Procesando…':'Elegir fotografías'}
     <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/>
   </label>
  </div>
  {message&&<p className="admin-photo-status" role="status">{message}</p>}
  <div className="gallery-editor-list">
   {loading?<p>Cargando imágenes…</p>:photos.length===0?<p>No hay imágenes todavía. Sube las primeras fotos para llenar el carrusel de la web.</p>:photos.map((photo,index)=><PhotoEditor key={photo.id} photo={photo} index={index} total={photos.length} busy={busy} onSave={save} onMove={move} onRemove={remove}/>)}
  </div>
 </section>;
}
