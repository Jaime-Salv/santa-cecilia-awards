import React from 'react';
import { Plus, Save, Trash2, Archive, CalendarDays, UploadCloud, Trophy, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from './supabase';
import './editions-admin.css';

export default function EditionsAdmin(){
 const [editions,setEditions]=React.useState([]);
 const [awards,setAwards]=React.useState([]);
 const [nominees,setNominees]=React.useState([]);
 const [selected,setSelected]=React.useState(null);
 const [newYear,setNewYear]=React.useState('2027');
 const [newTitle,setNewTitle]=React.useState('Santa Cecilia Awards 2027');
 const [awardName,setAwardName]=React.useState('');
 const [awardType,setAwardType]=React.useState('public');
 const [newNominees,setNewNominees]=React.useState({});
 const [saving,setSaving]=React.useState(false);
 const [message,setMessage]=React.useState('');
 const [error,setError]=React.useState('');
 const load=React.useCallback(async()=>{
  const [e,a,n]=await Promise.all([
   supabase.from('sca_editions').select('id,year,title,status,published').order('year',{ascending:false}),
   supabase.from('sca_edition_awards').select('id,edition_id,title,description,display_order,award_type').order('display_order'),
   supabase.from('sca_edition_nominees').select('id,award_id,name,photo_url,video_url,display_order').order('display_order')
  ]);
  if(e.error||a.error||n.error){setError('Error al cargar temporadas: '+(e.error||a.error||n.error).message);return}
  setEditions(e.data||[]);setAwards(a.data||[]);setNominees(n.data||[]);
  setSelected(v=>(e.data||[]).some(t=>t.id===v)?v:((e.data||[]).find(t=>t.status==='draft')||(e.data||[])[0])?.id||null);
 },[]);
 React.useEffect(()=>{load()},[load]);
 const edition=editions.find(e=>e.id===selected);
 const draft=edition?.status==='draft';
 const editionAwards=awards.filter(a=>a.edition_id===selected);
 async function perform(operation,ok){
  setSaving(true);setError('');setMessage('');
  try{await operation();await load();setMessage(ok||'Cambios guardados.')}catch(e){setError(e.message||'Error al guardar')}
  finally{setSaving(false)}
 }
 function fail(error){if(error)throw error}
 async function createEdition(e){
  e.preventDefault();
  const year=Number(newYear);
  if(!Number.isInteger(year)||year<2027||year>2100){setError('Selecciona un año válido a partir de 2027.');return}
  if(editions.some(x=>x.year===year)){setError('Ya existe esa edición.');return}
  await perform(async()=>{
   const {data,error}=await supabase.from('sca_editions').insert({year,title:newTitle.trim()||'Santa Cecilia Awards '+year,status:'draft',published:false}).select('id').single();
   fail(error);setSelected(data.id);
  },'Edición '+year+' creada en borrador. La gala real de 2026 no cambia.');
 }
 async function saveEdition(){
  if(!draft)return;
  await perform(async()=>{const {error}=await supabase.from('sca_editions').update({title:edition.title}).eq('id',edition.id);fail(error)},'Nombre de la edición guardado.');
 }
 async function createAward(e){
  e.preventDefault();
  if(!draft||!awardName.trim())return;
  await perform(async()=>{
   const max=editionAwards.reduce((m,a)=>Math.max(m,a.display_order),0);
   const {error}=await supabase.from('sca_edition_awards').insert({edition_id:selected,title:awardName.trim(),award_type:awardType,display_order:max+1});fail(error);
   setAwardName('');
  },'Premio añadido a la nueva edición.');
 }
 async function saveAward(a,changes){
  if(!draft)return;
  await perform(async()=>{const {error}=await supabase.from('sca_edition_awards').update(changes).eq('id',a.id);fail(error)},'Premio actualizado.');
 }
 async function deleteAward(a){
  if(!draft||!window.confirm('¿Eliminar el premio «'+a.title+'» y todos sus nominados de este borrador?'))return;
  await perform(async()=>{const {error}=await supabase.from('sca_edition_awards').delete().eq('id',a.id);fail(error)},'Premio eliminado del borrador.');
 }
 async function addNominee(e,a){
  e.preventDefault();const name=(newNominees[a.id]||'').trim();if(!name||!draft)return;
  await perform(async()=>{
   const order=nominees.filter(n=>n.award_id===a.id).reduce((m,n)=>Math.max(m,n.display_order),0)+1;
   const {error}=await supabase.from('sca_edition_nominees').insert({award_id:a.id,name,display_order:order});fail(error);
   setNewNominees(m=>({...m,[a.id]:''}));
  },'Nominado añadido.');
 }
 async function editNominee(n,changes){
  if(!draft)return;
  await perform(async()=>{const {error}=await supabase.from('sca_edition_nominees').update(changes).eq('id',n.id);fail(error)},'Nominado actualizado.');
 }
 async function deleteNominee(n){
  if(!draft||!window.confirm('¿Eliminar a «'+n.name+'» de este borrador?'))return;
  await perform(async()=>{const {error}=await supabase.from('sca_edition_nominees').delete().eq('id',n.id);fail(error)},'Nominado eliminado.');
 }
 async function uploadPhoto(n,file){
  if(!file||!draft)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){setError('Foto JPG, PNG o WebP de máximo 8 MB.');return}
  await perform(async()=>{
   const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
   const path='future/'+edition.year+'/'+n.id+'/'+crypto.randomUUID()+'.'+ext;
   const {error}=await supabase.storage.from('sca-nominee-media').upload(path,file,{contentType:file.type,upsert:false});fail(error);
   const url=supabase.storage.from('sca-nominee-media').getPublicUrl(path).data.publicUrl;
   const saved=await supabase.from('sca_edition_nominees').update({photo_url:url}).eq('id',n.id);
   if(saved.error){await supabase.storage.from('sca-nominee-media').remove([path]);throw saved.error}
  },'Foto del nominado guardada.');
 }
 async function archive2026(){
  if(!window.confirm('¿ARCHIVAR DEFINITIVAMENTE LOS GANADORES DE 2026 EN EL HALL OF FAME? Es imprescindible que la gala real haya terminado, los resultados estén publicados y el ganador del Guante registrado.'))return;
  await perform(async()=>{const {error,data}=await supabase.rpc('sca_archive_2026_gala');fail(error);setMessage(data+' galardones archivados.')},'Edición 2026 archivada en el Hall of Fame.');
 }
 return <section className="ed-admin">
   <div className="ed-heading"><span className="admin-eyebrow">CONFIGURACIÓN PLURIANUAL</span><h2>Temporadas y premios</h2><p>Prepara los años siguientes sin alterar los resultados, archivos o votaciones de 2026. Cada edición conserva sus premios y nominados propios.</p></div>
   {error&&<p className="admin-error" role="alert">{error}</p>}
   {message&&<p className="ed-message" role="status">{message}</p>}
   <div className="ed-tabs">{editions.map(e=><button key={e.id} type="button" className={selected===e.id?'selected':''} onClick={()=>setSelected(e.id)}><CalendarDays size={15}/>{e.year}<small>{e.status==='draft'?'BORRADOR':e.status==='archived'?'ARCHIVADA':'ACTUAL'}</small></button>)}</div>
   <form onSubmit={createEdition} className="ed-create-year"><strong><Plus size={18}/> Nueva edición</strong><div><label>Año<input value={newYear} type="number" min="2027" max="2100" onChange={e=>{setNewYear(e.target.value);setNewTitle('Santa Cecilia Awards '+e.target.value)}}/></label><label>Nombre<input value={newTitle} maxLength={160} onChange={e=>setNewTitle(e.target.value)}/></label><button type="submit" disabled={saving}>Crear borrador</button></div></form>
   {edition&&<div className="ed-selected">
     <div className="ed-edition-title"><h3>{edition.title}</h3><span>{edition.status==='draft'?'Edición en preparación':edition.status==='archived'?'Edición archivada':'Gala actual'}</span></div>
     {edition.year===2026?
      <div className="ed-current-year">
       <ShieldCheck size={25} color="#d6b57b"/>
       <div><strong>Edición 2026 protegida</strong><p>Sus premios, nominados, fotos, votos y el flujo de la gala permanecen en el sistema actual. No los modificaremos desde esta pestaña. Cuando termine la gala, podrás archivar sus ganadores sin duplicar datos.</p>
        <button disabled={saving||edition.status==='archived'} type="button" onClick={archive2026}><Archive size={17}/>{edition.status==='archived'?'2026 ya archivado':'Guardar ganadores 2026 en Hall of Fame'}</button>
       </div>
      </div>:
      <>
       <p className="ed-limits">Esta edición está en <strong>borrador editable</strong>. Puedes crear, editar y borrar premios y nominados. La votación activa sigue siendo la de 2026: poner en marcha el motor de votación para una nueva edición requiere una activación específica, que todavía no está implementada.</p>
       {draft&&<form className="ed-create-award" onSubmit={createAward}><strong>Nuevo premio</strong><input value={awardName} onChange={e=>setAwardName(e.target.value)} placeholder="Nombre del premio" maxLength={180} required/><select value={awardType} onChange={e=>setAwardType(e.target.value)}><option value="public">Votación popular</option><option value="director">Elección del director</option></select><button disabled={saving} type="submit"><Plus size={15}/> Añadir premio</button></form>}
       <div className="ed-awards">{editionAwards.map(a=><EditionAward key={a.id} award={a} nominees={nominees.filter(n=>n.award_id===a.id)} disabled={!draft||saving} onSave={changes=>saveAward(a,changes)} onDelete={()=>deleteAward(a)} onAdd={e=>addNominee(e,a)} newNominee={newNominees[a.id]||''} setNewNominee={v=>setNewNominees(m=>({...m,[a.id]:v}))} onEditNominee={editNominee} onDeleteNominee={deleteNominee} onPhoto={uploadPhoto}/>)}</div>
       {!editionAwards.length&&<p className="ed-no-awards">Todavía no hay premios para esta edición. Añade el primero con el formulario.</p>}
      </>
     }
   </div>}
 </section>;
}

function EditionAward({award:a,nominees,disabled,onSave,onDelete,onAdd,newNominee,setNewNominee,onEditNominee,onDeleteNominee,onPhoto}){
 const [title,setTitle]=React.useState(a.title);
 const [description,setDescription]=React.useState(a.description||'');
 const [kind,setKind]=React.useState(a.award_type);
 React.useEffect(()=>{setTitle(a.title);setDescription(a.description||'');setKind(a.award_type)},[a.title,a.description,a.award_type]);
 return <details className="ed-award" open={false}><summary><Trophy size={19}/><span>{a.title}</span><small>{a.award_type==='director'?'DIRECTOR':'VOTO POPULAR'} · {nominees.length} nominados</small></summary>
  <div className="ed-award-content">
    <div className="ed-award-fields"><label>Nombre<input value={title} disabled={disabled} onChange={e=>setTitle(e.target.value)} maxLength={180}/></label><label>Descripción<textarea rows={2} value={description} disabled={disabled} onChange={e=>setDescription(e.target.value)}/></label><label>Tipo de elección<select disabled={disabled} value={kind} onChange={e=>setKind(e.target.value)}><option value="public">Voto popular</option><option value="director">Elección del director</option></select></label><button type="button" disabled={disabled||!title.trim()} onClick={()=>onSave({title:title.trim(),description,award_type:kind})}><Save size={15}/> Guardar premio</button><button className="ed-danger" type="button" disabled={disabled} onClick={onDelete}><Trash2 size={15}/> Eliminar premio</button></div>
    {kind==='director'&&<p className="ed-note">Elección del director: no requiere nominados. El ganador se registrará en la gala correspondiente.</p>}
    {nominees.map(n=><EditionNominee key={n.id} item={n} disabled={disabled} onSave={changes=>onEditNominee(n,changes)} onDelete={()=>onDeleteNominee(n)} onPhoto={file=>onPhoto(n,file)}/>)}
    {kind==='public'&&!disabled&&<form onSubmit={onAdd} className="ed-add-nominee"><input value={newNominee} placeholder="Nombre del nuevo nominado" required maxLength={180} onChange={e=>setNewNominee(e.target.value)}/><button type="submit"><Plus size={15}/> Añadir nominado</button></form>}
  </div>
 </details>;
}

function EditionNominee({item:n,disabled,onSave,onDelete,onPhoto}){
 const [name,setName]=React.useState(n.name);
 const [video,setVideo]=React.useState(n.video_url||'');
 React.useEffect(()=>{setName(n.name);setVideo(n.video_url||'')},[n.name,n.video_url]);
 return <div className="ed-nominee">
   {n.photo_url?<img src={n.photo_url} alt={n.name}/>:<div className="ed-no-photo"><UploadCloud size={21}/></div>}
   <div className="ed-nominee-edit"><label>Nombre<input value={name} disabled={disabled} maxLength={180} onChange={e=>setName(e.target.value)}/></label><label>Enlace de vídeo<input value={video} type="url" disabled={disabled} onChange={e=>setVideo(e.target.value)} placeholder="https://…"/></label>
    {!disabled&&<label className="ed-image-chooser">Subir fotografía<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];e.target.value='';onPhoto(f)}}/></label>}
   </div>
   <div className="ed-nominee-buttons"><button type="button" disabled={disabled||!name.trim()} onClick={()=>onSave({name:name.trim(),video_url:video.trim()||null})}><Save size={15}/> Guardar</button><button className="ed-danger" disabled={disabled} type="button" onClick={onDelete}><Trash2 size={15}/></button></div>
 </div>;
}
