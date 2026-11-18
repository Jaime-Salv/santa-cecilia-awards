import React from 'react';
import { ArrowRight, ArrowLeft, Check, LockKeyhole, Vote, RotateCw, Eye, PartyPopper } from 'lucide-react';
import { supabase } from './supabase';
import './guided-voting.css';

function tokenFor(mode){
 const key='sca_ballot_token_2026_'+mode;
 try{
   let token=localStorage.getItem(key);
   if(!token){ token=crypto.randomUUID();localStorage.setItem(key,token); }
   return token;
 }catch(e){return null}
}

export default function GuidedVoting(){
 const [settings,setSettings]=React.useState({gala_mode:'inactive',voting_open:false,unlocked_order:0,results_published:false});
 const [awards,setAwards]=React.useState([]);
 const [myVotes,setMyVotes]=React.useState({});
 const [step,setStep]=React.useState(1);
 const [selected,setSelected]=React.useState(null);
 const [working,setWorking]=React.useState(false);
 const [loading,setLoading]=React.useState(true);
 const [error,setError]=React.useState('');
 const modeRef=React.useRef(null);

 const refresh=React.useCallback(async()=>{
   const {data:state,error:stateError}=await supabase.from('sca_settings')
      .select('gala_mode,voting_open,unlocked_order,results_published').eq('id',1).single();
   if(stateError){setError('No se puede consultar el estado de la gala.');setLoading(false);return}
   setSettings(state);
   const active=state.gala_mode==='live'||state.gala_mode==='rehearsal';
   if(active&&modeRef.current!==state.gala_mode){setStep(1);setSelected(null);setMyVotes({});modeRef.current=state.gala_mode}
   if(!active){modeRef.current=null;setAwards([]);setLoading(false);return}
   const token=tokenFor(state.gala_mode);
   if(!token){setError('Tu navegador no permite conservar un identificador local para el voto. Activa el almacenamiento del sitio.');setLoading(false);return}
   const [options,votes]=await Promise.all([
     supabase.rpc('sca_gala_ballot_options'),
     supabase.rpc('sca_gala_my_votes',{p_token:token})
   ]);
   if(options.error||votes.error){
     setError('No se pueden cargar las nominaciones de votación: '+(options.error||votes.error).message);
     setLoading(false);return;
   }
   const byOrder={};
   (options.data||[]).forEach(x=>{
     if(!byOrder[x.award_order])byOrder[x.award_order]={id:x.award_id,order:x.award_order,title:x.award_title,slug:x.award_slug,nominees:[]};
     byOrder[x.award_order].nominees.push({id:x.nominee_id,name:x.nominee_name});
   });
   setAwards(Object.values(byOrder).sort((a,b)=>a.order-b.order));
   const mapped={};
   (votes.data||[]).forEach(v=>{mapped[v.award_id]=v.nominee_id});
   setMyVotes(mapped);
   setLoading(false);setError('');
 },[]);

 React.useEffect(()=>{
  refresh();
  const interval=setInterval(()=>{if(!working)refresh()},4000);
  return ()=>clearInterval(interval);
 },[refresh,working]);

 const current=awards.find(a=>a.order===step);
 const voted=current?Boolean(myVotes[current.id]):false;
 const lastAward=10;
 const isActive=settings.gala_mode==='live'||settings.gala_mode==='rehearsal';
 const canVote=isActive&&settings.voting_open&&step<=settings.unlocked_order;
 const nextUnlocked=step<settings.unlocked_order;
 const totalVoted=awards.filter(a=>myVotes[a.id]).length;

 async function castVote(){
   if(!current||!selected||voted||working||!canVote)return;
   if(!window.confirm('¿Confirmas tu voto? No podrás cambiarlo después.'))return;
   setWorking(true);setError('');
   const {data,error:voteError}=await supabase.rpc('sca_gala_submit_vote',{
     p_token:tokenFor(settings.gala_mode),p_award:current.id,p_nominee:selected
   });
   if(voteError)setError(voteError.message);
   else if(data!==true)setError('Este navegador ya tiene un voto para este premio. Se mantiene el primero.');
   await refresh();setWorking(false);
 }

 function next(){
   if(voted&&nextUnlocked&&step<lastAward){setStep(s=>s+1);setSelected(null)}
 }
 function previous(){if(step>1){setStep(s=>s-1);setSelected(null)}}

 if(settings.gala_mode==='finished')return <div className="guided-voting-main">
   <PartyPopper size={37} color="#d7b77c"/>
   <h3>La gala ha terminado</h3>
   <p>{settings.results_published?'Ya puedes descubrir las fotografías y resultados de todos los premios en «Los protagonistas de la gala».':'La organización anunciará los resultados cuando llegue el momento.'}</p>
   <a className="guided-voting-link" href="#nominados">{settings.results_published?'VER RESULTADOS':'VOLVER A LAS CATEGORÍAS'} <ArrowRight size={16}/></a>
 </div>;

 if(!isActive)return <div className="guided-voting-main">
   <LockKeyhole size={35} color="#d7b77c"/><h3>La gala todavía no ha comenzado</h3>
   <p>Las nominaciones se descubrirán una a una durante la cena. Cuando la organización abra las votaciones, podrás elegir desde aquí.</p>
   <span className="guided-voting-status">VOTACIONES CERRADAS</span>
 </div>;

 if(loading)return <div className="guided-voting-main"><RotateCw size={26}/><p>Cargando la votación…</p></div>;

 return <div className="guided-voting-main" aria-live="polite">
   {settings.gala_mode==='rehearsal'&&<div className="guided-rehearsal-banner">SIMULACRO · LOS VOTOS NO CUENTAN PARA LA GALA REAL</div>}
   <span className="guided-label">VOTACIÓN DE SANTA CECILIA AWARDS 2026</span>
   <h3>{step===1?'Empieza la votación':'Seguimos con el siguiente premio'}</h3>
   <div className="guided-progress"><span>PREMIO {String(step).padStart(2,'0')} / 10</span><span>{totalVoted} votaciones registradas en este navegador</span></div>
   <div className="guided-progress-track"><div style={{width:(step/10*100)+'%'}}/></div>
   {step>settings.unlocked_order||!settings.voting_open
     ? <div className="guided-waiting"><LockKeyhole size={33}/><h4>{!settings.voting_open?'La votación está pausada':'Esperando al siguiente premio'}</h4><p>La organización irá habilitando cada premio durante la cena. Esta pantalla se actualizará automáticamente.</p></div>
     :current?<div className="guided-award">
       <span className="guided-award-number">PREMIO N.º {String(step).padStart(2,'0')}</span>
       <h4>{current.title}</h4>
       <p>Selecciona un nombre. Las fotos y los vídeos se mostrarán después de la gala.</p>
       <div className="guided-names">
         {current.nominees.map((n,i)=><button key={n.id} type="button"
           disabled={voted||working||!canVote}
           className={(selected===n.id?'picked ':'')+(myVotes[current.id]===n.id?'registered':'')}
           onClick={()=>setSelected(n.id)}>
           <span className="guided-name-index">{String(i+1).padStart(2,'0')}</span><span>{n.name}</span>
           {(selected===n.id||myVotes[current.id]===n.id)&&<Check size={20}/>}
         </button>)}
       </div>
       {!voted?<button type="button" className="guided-confirm" disabled={!selected||working||!canVote} onClick={castVote}><Vote size={18}/>{working?'Guardando voto…':'CONFIRMAR MI VOTO'}</button>
         :<div className="guided-success"><Check size={20}/> Voto registrado. No se puede modificar.</div>}
       <div className="guided-navigation">
         <button type="button" className="guided-back" onClick={previous} disabled={step===1||working}><ArrowLeft size={18}/> ANTERIOR</button>
         {step===10&&voted?<div className="guided-finished"><PartyPopper size={18}/> ¡Has completado las diez votaciones!</div>:
         <button type="button" className="guided-next" onClick={next} disabled={!voted||!nextUnlocked||working}>
           {voted&&!nextUnlocked?<><LockKeyhole size={17}/> EL SIGUIENTE PREMIO ESTÁ BLOQUEADO</>:<>SIGUIENTE PREMIO <ArrowRight size={18}/></>}
         </button>}
       </div>
     </div>:
     <div className="guided-waiting"><LockKeyhole size={33}/><h4>Premio en preparación</h4><p>La organización está preparando los nombres de este premio.</p></div>}
   {error&&<p className="guided-error" role="alert">{error}</p>}
   <small className="guided-footnote">El voto es anónimo. Se limita a una selección por premio y navegador; cambiar de dispositivo o borrar sus datos podría permitir votar otra vez.</small>
 </div>;
}
