import React from 'react';
import { ImagePlus, Film, UploadCloud, PlayCircle } from 'lucide-react';
import './nominee-media-admin.css';

export default function NomineeMediaAdmin({nominee,busy,onUpload,onSave}){
 const [over,setOver]=React.useState(false);
 const [videoLink,setVideoLink]=React.useState(nominee.video_url||'');
 React.useEffect(()=>setVideoLink(nominee.video_url||''),[nominee.video_url]);
 function accept(files){
  setOver(false);
  if(busy)return;
  const arr=Array.from(files||[]);
  if(!arr.length)return;
  if(arr.length!==1){window.alert('Arrastra un archivo cada vez sobre cada nominado.');return}
  onUpload(nominee,arr[0]);
 }
 const isVideo=nominee.video_url && /\.mp4(?:\?|$)/i.test(nominee.video_url);
 return <div className="nominee-media-manager">
  <div className={'nominee-dropzone'+(over?' is-over':'')+(busy?' is-busy':'')}
   onDragEnter={e=>{e.preventDefault();e.stopPropagation();if(!busy)setOver(true)}}
   onDragOver={e=>{e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect=busy?'none':'copy';if(!busy)setOver(true)}}
   onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(!e.currentTarget.contains(e.relatedTarget))setOver(false)}}
   onDrop={e=>{e.preventDefault();e.stopPropagation();accept(e.dataTransfer.files)}}>
   <div className="nominee-drop-preview">
    {nominee.photo_url?<img src={nominee.photo_url} alt={'Fotografía de '+nominee.name}/>:isVideo?<video src={nominee.video_url} muted preload="metadata" playsInline/>:<ImagePlus size={29} strokeWidth={1.2}/>}
   </div>
   <div className="nominee-drop-hint"><UploadCloud size={21}/><strong>Arrastra aquí foto o MP4</strong><span>Formato vertical recomendado (3:4 o 4:5)</span><small>JPG/PNG/WebP hasta 8 MB · MP4 hasta 45 MB</small></div>
   <label className="nominee-pick-file">{busy?'Subiendo…':'Elegir archivo'}
    <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4" disabled={busy} onChange={e=>{accept(e.target.files);e.target.value=''}}/>
   </label>
  </div>
  {nominee.video_url&&<div className="nominee-current-video">{isVideo?<><PlayCircle size={16}/> <span>Vídeo MP4 cargado</span><a href={nominee.video_url} target="_blank" rel="noreferrer">Abrir</a></>:<><Film size={16}/> <span>Vídeo enlazado</span><a href={nominee.video_url} target="_blank" rel="noreferrer">Abrir</a></>}</div>}
  <label className="admin-video-label">Enlace externo de vídeo (opcional)
   <input type="url" value={videoLink} placeholder="https://…" onChange={e=>setVideoLink(e.target.value)} onBlur={()=>{const v=videoLink.trim();if(v!==(nominee.video_url||''))onSave(nominee,{video_url:v||null})}}/>
  </label>
 </div>;
}
