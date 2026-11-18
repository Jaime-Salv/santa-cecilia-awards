import React from 'react';
import { Trophy, Crown, CalendarDays } from 'lucide-react';
import { supabase } from './supabase';
import './hall-of-fame.css';

export default function HallOfFame(){
 const [editions,setEditions]=React.useState([]);
 const [winners,setWinners]=React.useState([]);
 const [year,setYear]=React.useState(null);
 const [loading,setLoading]=React.useState(true);
 React.useEffect(()=>{
  let active=true;
  async function load(){
   const [e,w]=await Promise.all([
    supabase.from('sca_editions').select('id,year,title').eq('status','archived').eq('published',true).order('year',{ascending:false}),
    supabase.from('sca_hall_of_fame').select('id,edition_id,award_title,winner_name,photo_url,video_url,votes,winner_type,award_order').order('award_order')
   ]);
   if(!active)return;
   if(!e.error&& !w.error){
    setEditions(e.data||[]);setWinners(w.data||[]);
    setYear(v=>v!==null&&(e.data||[]).some(x=>x.year===v)?v:(e.data||[])[0]?.year||null);
   }
   setLoading(false);
  }
  load();
  return()=>{active=false};
 },[]);
 const edition=editions.find(e=>e.year===year);
 const records=winners.filter(w=>w.edition_id===edition?.id);
 const director=records.filter(w=>w.winner_type==='director');
 const publicAwards=Object.values(records.filter(w=>w.winner_type==='public').reduce((m,w)=>{
  const key=w.award_order;
  if(!m[key])m[key]={title:w.award_title,order:key,winners:[]};
  m[key].winners.push(w);return m;
 },{})).sort((a,b)=>a.order-b.order);
 return <section id="hall-of-fame" className="hof-section">
   <div className="hof-intro"><span className="eyebrow gold-text">EL LEGADO DE LA BANDA</span><h2>Hall of <em>Fame.</em></h2><p>Cada gala deja ganadores y recuerdos. Este es su lugar para siempre.</p></div>
   {loading?<p className="hof-empty">Cargando el histórico…</p>:editions.length===0?
    <div className="hof-empty"><Trophy size={30}/><strong>La historia comienza en 2026.</strong><span>Los primeros ganadores aparecerán aquí cuando finalice y se archive la gala.</span></div>:
    <>
     <div className="hof-years">{editions.map(e=><button type="button" key={e.id} className={e.year===year?'selected':''} onClick={()=>setYear(e.year)}><CalendarDays size={16}/>{e.year}</button>)}</div>
     <div className="hof-year-title"><span>EDICIÓN {year}</span><strong>{edition?.title}</strong><small>{records.length} galardones registrados</small></div>
     {director.map(w=><article className="hof-director" key={w.id}>
       <div className="hof-director-photo">{w.photo_url?<img src={w.photo_url} alt={w.winner_name} loading="lazy"/>:<Crown size={60}/>}</div>
       <div><span className="eyebrow gold-text">PREMIO PRINCIPAL · ELECCIÓN DEL DIRECTOR</span><h3>{w.award_title}</h3><strong>{w.winner_name}</strong><p>Galardonado en la edición {year}</p></div>
     </article>)}
     <div className="hof-grid">{publicAwards.map(a=><article className="hof-award" key={a.order}>
       <span className="hof-award-label">PREMIO {String(a.order).padStart(2,'0')}</span>
       <h3>{a.title}</h3>
       {a.winners.map(w=><div className="hof-winner" key={w.id}>
        {w.photo_url?<img src={w.photo_url} alt={w.winner_name} loading="lazy"/>:<div className="hof-no-photo"><Trophy size={25}/></div>}
        <div><strong>{w.winner_name}</strong>{w.votes!==null&&<small>{w.votes} votos</small>}{w.video_url&&<a href={w.video_url} rel="noopener noreferrer" target="_blank">Ver vídeo</a>}</div>
       </div>)}
       {a.winners.length>1&&<span className="hof-tie">Ganadores empatados</span>}
     </article>)}</div>
    </>
   }
 </section>;
}
