import React from 'react';
import { ArrowLeft, ArrowRight, Camera, Images } from 'lucide-react';
import { supabase } from './supabase';
import './year-gallery.css';

export default function YearGallery(){
 const [photos,setPhotos]=React.useState([]);
 const [loading,setLoading]=React.useState(true);
 const track=React.useRef(null);

 React.useEffect(()=>{
  let live=true;
  supabase.from('sca_year_photos')
   .select('id,image_url,caption,sort_order')
   .order('sort_order',{ascending:true})
   .order('created_at',{ascending:true})
   .then(({data,error})=>{
    if(!live)return;
    if(!error)setPhotos(data||[]);
    setLoading(false);
   });
  return ()=>{live=false};
 },[]);

 function scroll(direction){
  const el=track.current;
  if(!el)return;
  el.scrollBy({left:direction*Math.max(260,el.clientWidth*.72),behavior:'smooth'});
 }

 return <section id="recuerdos-2026" className="year-recap" aria-labelledby="year-recap-title">
  <div className="year-recap-head">
   <div>
    <span className="eyebrow gold-text">ANTES DE CONOCER A LOS NOMINADOS</span>
    <h2 id="year-recap-title">¿Cómo ha ido el <em>2026?</em></h2>
    <p>Ensayos, actuaciones, viajes y momentos que solo entiende nuestra banda. Un año para recordar.</p>
   </div>
   {photos.length>1&&<div className="year-recap-buttons">
    <button type="button" onClick={()=>scroll(-1)} aria-label="Fotografías anteriores"><ArrowLeft size={20}/></button>
    <button type="button" onClick={()=>scroll(1)} aria-label="Fotografías siguientes"><ArrowRight size={20}/></button>
   </div>}
  </div>
  {photos.length?
   <div className="year-recap-track" ref={track} role="region" aria-label="Galería horizontal de recuerdos de 2026" tabIndex={0}>
    {photos.map((photo,i)=><figure className="year-recap-slide" key={photo.id}>
      <img src={photo.image_url} alt={photo.caption||'Recuerdo de 2026, fotografía '+(i+1)} loading="lazy"/>
      {photo.caption&&<figcaption>{photo.caption}</figcaption>}
      <span className="year-recap-number">{String(i+1).padStart(2,'0')} / {String(photos.length).padStart(2,'0')}</span>
    </figure>)}
   </div>
   :<div className="year-recap-empty"><Images size={30} strokeWidth={1.2}/><strong>{loading?'Cargando recuerdos…':'Las mejores imágenes del 2026 están por llegar.'}</strong><span>Muy pronto repasaremos juntos los momentos más memorables del año.</span></div>}
  <div className="year-recap-bottom"><span><Camera size={14}/> NUESTRO AÑO EN IMÁGENES</span><span>DESLIZA PARA VER MÁS <ArrowRight size={14}/></span></div>
 </section>;
}
