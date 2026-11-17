import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowLeft, ArrowDown, LockKeyhole, Award, Menu, X, Shield, Film, Image as ImageIcon, Crown } from 'lucide-react';
import './styles.css';
import Admin from './Admin';
import YearGallery from './YearGallery';
import { supabase } from './supabase';

const EXTRA_SLUGS = ['guante-de-mickey','cachorro-del-ano'];
const MAIN_GLOVE = 'guante-de-mickey';
const PUPPY = 'cachorro-del-ano';
const ASSET_FALLBACKS = { 'guante-de-mickey':'/images/guante-de-mickey.webp', 'cachorro-del-ano':'/images/cachorro-del-ano.webp' };

function TrophyPhoto({ award, slug, alt, fallback }) {
 const [failed,setFailed]=React.useState(false);
 const src=award?.image_url || ASSET_FALLBACKS[slug];
 React.useEffect(()=>setFailed(false),[src]);
 return <div className={'award-photo '+(slug===MAIN_GLOVE?'award-photo-glove':'award-photo-puppy')}>
   {!failed && src ? <img src={src} alt={alt} loading="lazy" onError={()=>setFailed(true)}/> : <div className="photo-missing" aria-label="Fotografía pendiente de cargar">{fallback}<small>FOTOGRAFÍA DEL TROFEO PENDIENTE</small></div>}
 </div>;
}

function App(){
 const [menu,setMenu]=React.useState(false);
 const [categories,setCategories]=React.useState([]);
 const [selected,setSelected]=React.useState(null);
 const [loading,setLoading]=React.useState(true);
 const [votingOpen,setVotingOpen]=React.useState(false);
 React.useEffect(()=>{
  let active=true;
  async function load(){
   const [awards,nominees,settings]=await Promise.all([
    supabase.from('sca_awards').select('id,title,description,slug,image_url,display_order').order('display_order'),
    supabase.from('sca_nominees').select('id,award_id,name,description,photo_url,video_url').order('display_order'),
    supabase.from('sca_settings').select('voting_open').eq('id',1).maybeSingle()
   ]);
   if(!active)return;
   if(!awards.error)setCategories((awards.data||[]).map(a=>({...a,nominees:(nominees.data||[]).filter(n=>n.award_id===a.id)})));
   setVotingOpen(Boolean(settings.data?.voting_open));
   setLoading(false);
  }
  load();return()=>{active=false};
 },[]);
 const regular=categories.filter(c=>!EXTRA_SLUGS.includes(c.slug));
 const glove=categories.find(c=>c.slug===MAIN_GLOVE);
 const puppy=categories.find(c=>c.slug===PUPPY);
 const active=regular.find(c=>c.slug===selected);
 function openCategory(slug){setSelected(slug);window.requestAnimationFrame(()=>document.getElementById('nominados')?.scrollIntoView({behavior:'smooth'}));}
 function backToList(){setSelected(null);window.requestAnimationFrame(()=>document.getElementById('nominados')?.scrollIntoView({behavior:'smooth'}));}
 return <>
 <header className="site-header">
  <a href="#inicio" className="site-brand" onClick={()=>setMenu(false)}><span className="site-monogram">SC<span>✦</span></span><span className="brand-caption">SANTA CECILIA<br/>AWARDS <b>2026</b></span></a>
  <nav className={menu?'site-nav open':'site-nav'} aria-label="Navegación principal">
   <a href="#nominados" onClick={()=>{backToList();setMenu(false)}}>Categorías</a>
   <a href="#premios" onClick={()=>setMenu(false)}>Grandes premios</a>
   <a href="#votacion" onClick={()=>setMenu(false)}>Votaciones</a>
   <a href="/admin" className="nav-admin-mobile" onClick={()=>setMenu(false)}><Shield size={15}/> Administración</a>
  </nav>
  <div className="header-actions"><a href="/admin" className="admin-access"><LockKeyhole size={14}/><span>Administración</span></a><a href="#nominados" className="header-vote">DESCUBRE LOS NOMINADOS <ArrowRight size={15}/></a></div>
  <button className="menu-toggle" aria-label={menu?'Cerrar menú':'Abrir menú'} aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X size={23}/>:<Menu size={23}/>}</button>
 </header>
 <main id="inicio">
  <section className="opening">
   <div className="opening-grain" aria-hidden="true"/><div className="opening-arc" aria-hidden="true"/>
   <div className="opening-body">
    <div className="edition-line"><span/> LA GRAN GALA DE LA BANDA <span/></div>
    <div className="opening-overline">Una celebración de lo extraordinariamente nuestro</div>
    <h1><span>Santa Cecilia</span><em>Awards</em></h1>
    <div className="opening-year"><span>EST.</span><strong>2026</strong><span>EDICIÓN</span></div>
    <p className="opening-description">Una noche. Nueve categorías. Historias que nunca olvidaremos. Y dos grandes premios para el final.</p>
    <div className="opening-buttons"><a className="gold-button" href="#nominados">DESCUBRIR LAS CATEGORÍAS <ArrowRight size={16}/></a></div>
   </div>
   <div className="opening-bottom"><span>✦ NO TODO ES MÚSICA ✦</span><a href="#nominados">DESCUBRE LA GALA <ArrowDown size={15}/></a><span>SANTA CECILIA · 2026</span></div>
  </section>
  <YearGallery/>
  <section id="nominados" className="nominees-section category-hub">
   <div className="section-topline"><span>01 / LAS CATEGORÍAS</span><span>SANTA CECILIA AWARDS 2026</span></div>
   {!active ? <>
    <div className="nominees-heading"><span className="eyebrow gold-text">NUEVE PREMIOS, INFINITAS HISTORIAS</span><h2>Los protagonistas<br/><em>de la gala.</em></h2><p>Elige una categoría para descubrir a sus nominados, sus fotografías y los vídeos de los momentos más memorables.</p></div>
    {loading ? <div className="nominees-empty">Cargando categorías…</div> : regular.length ? <div className="award-category-grid">{regular.map((c,i)=>
     <button type="button" className="award-category-link" onClick={()=>openCategory(c.slug)} key={c.id}>
      <span className="category-top"><span>PREMIO {String(i+1).padStart(2,'0')}</span><Award size={19} strokeWidth={1.3}/></span>
      <strong>{c.title}</strong><span className="category-excerpt">{c.description||'Santa Cecilia Awards 2026'}</span>
      <span className="category-foot">VER NOMINADOS <ArrowRight size={17}/></span>
     </button>
    )}</div> : <div className="nominees-empty">Las categorías se anunciarán próximamente.</div>}
   </> : <>
    <button className="back-categories" onClick={backToList}><ArrowLeft size={16}/> TODAS LAS CATEGORÍAS</button>
    <div className="nominee-detail-intro"><span className="eyebrow gold-text">SANTA CECILIA AWARDS · NOMINACIONES</span><h2>{active.title}</h2>{active.description&&<p>{active.description}</p>}</div>
    {active.nominees.length ? <div className="nominee-detail-grid">{active.nominees.map((n,i)=><article className="nominee-detail-card" key={n.id}>
     <div className="nominee-detail-media">{n.photo_url?<img src={n.photo_url} alt={'Fotografía de '+n.name} loading="lazy"/>:<div className="no-nominee-image"><ImageIcon size={27} strokeWidth={1}/><span>FOTOGRAFÍA PENDIENTE</span></div>}</div>
     <div className="nominee-detail-info"><span>NOMINADO {String(i+1).padStart(2,'0')}</span><h3>{n.name}</h3>{n.description&&<p>{n.description}</p>}{n.video_url&&<a href={n.video_url} target="_blank" rel="noopener noreferrer"><Film size={15}/> VER VÍDEO DEL MOMENTO <ArrowRight size={14}/></a>}</div>
    </article>)}</div> : <div className="nominees-empty"><Award size={25}/><strong>Nominados pendientes de publicación</strong><span>La organización está terminando de revisar esta categoría.</span></div>}
    <button className="back-categories bottom" onClick={backToList}><ArrowLeft size={16}/> VOLVER A LOS PREMIOS</button>
   </>}
  </section>
  <section id="premios" className="prize-section finale-section">
   <div className="section-topline"><span>02 / LOS GRANDES PREMIOS</span><span>EL MOMENTO MÁS ESPERADO</span></div>
   <div className="finale-intro"><span className="eyebrow gold-text">Y PARA TERMINAR…</span><h2>Lo mejor se guarda<br/><em>para el final.</em></h2><p>Dos galardones especiales. Dos momentos únicos. Solo ellos tienen trofeo propio.</p></div>
   <article className="second-prize finale-puppy">
    <div className="second-copy"><span className="eyebrow gold-text">SEGUNDO GRAN GALARDÓN</span><span className="prize-index">EL RECONOCIMIENTO A LOS CACHORROS</span><h3>Cachorro<br/><em>del Año.</em></h3><p>El premio a las nuevas generaciones de nuestra banda. Uno de los grandes protagonistas de la noche.</p><span className="prize-meta">EL GALARDÓN DORADO</span></div>
    <TrophyPhoto award={puppy} slug={PUPPY} alt="Trofeo dorado del Cachorro del Año con el escudo de la banda" fallback="♛"/>
   </article>
   <div className="finale-reveal"><span>Y EL GRAN PREMIO DE LA NOCHE…</span><div className="finale-rule">✦</div></div>
   <article className="featured-prize finale-glove">
    <TrophyPhoto award={glove} slug={MAIN_GLOVE} alt="Guante de Mickey blanco firmado sobre pedestal negro" fallback="✋"/>
    <div className="prize-copy"><span className="eyebrow gold-text">EL GALARDÓN MÁS CODICIADO</span><span className="prize-index">GRAN PREMIO · ELECCIÓN DEL DIRECTOR</span><h3>El Guante<br/><em>de Mickey.</em></h3><p>El director elige al ganador entre <strong>cualquier músico de la banda</strong>. No hay lista de nominados ni votación popular para este galardón.</p><div className="prize-divider"/><span className="prize-meta">UN SOLO ELEGIDO. UNA DECISIÓN DEL DIRECTOR.</span></div>
   </article>
  </section>
  <section id="votacion" className="voting-section"><div className="voting-frame">
   <span className="eyebrow gold-text">03 / EL VEREDICTO</span><h2>La última palabra<br/><em>es tuya.</em></h2>
   <p>La votación del público será anónima y sin cuentas. El Guante de Mickey queda fuera: lo decide el director.</p>
   <div className="voting-status"><LockKeyhole size={18}/>{votingOpen?'VOTACIÓN EN PREPARACIÓN':'VOTACIONES CERRADAS'}</div>
   <small>La papeleta anónima todavía no está disponible. No se están recogiendo votos.</small>
  </div></section>
 </main>
 <footer className="site-footer"><div className="footer-brand"><strong>SC <span>✦</span> AWARDS</strong><small>SANTA CECILIA · EDICIÓN 2026</small></div><p>Hecho para la banda, con mucho cariño y poca vergüenza.</p><a href="/admin"><LockKeyhole size={13}/> Acceso administración</a></footer>
 </>;
}
createRoot(document.getElementById('root')).render(window.location.pathname.replace(/\/$/,'')==='/admin'?<Admin/>:<App/>);
