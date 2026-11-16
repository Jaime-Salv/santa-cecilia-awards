import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, ArrowDown, LockKeyhole, Award, Menu, X, Shield, Sparkles, Film, CalendarDays } from 'lucide-react';
import './styles.css';
import Admin from './Admin';
import { supabase } from './supabase';

const featured = [
  { slug: 'guante-de-mickey', title: 'El Guante de Mickey', kicker: 'PREMIO PRINCIPAL', number: '01', description: 'El galardón más esperado de la noche. Hay premios que se ganan… y otros que te persiguen hasta el próximo ensayo.', className: 'glove' },
  { slug: 'cachorro-del-ano', title: 'Cachorro del Año', kicker: 'SEGUNDO GRAN PREMIO', number: '02', description: 'El reconocimiento a las nuevas generaciones. Porque los cachorros también merecen su momento bajo los focos.', className: 'puppy' }
];

function App() {
  const [menu, setMenu] = React.useState(false);
  const [categories, setCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [votingOpen, setVotingOpen] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState('all');

  React.useEffect(() => {
    let active = true;
    async function load() {
      const [awardsResult, nomineesResult, settingsResult] = await Promise.all([
        supabase.from('sca_awards').select('id,title,description,slug,image_url,featured').order('display_order'),
        supabase.from('sca_nominees').select('id,award_id,name,description,photo_url,video_url').order('display_order'),
        supabase.from('sca_settings').select('voting_open').eq('id', 1).maybeSingle()
      ]);
      if (!active) return;
      if (!awardsResult.error) {
        setCategories((awardsResult.data || []).map(a => ({
          ...a,
          nominees: (nomineesResult.data || []).filter(n => n.award_id === a.id)
        })));
      }
      setVotingOpen(Boolean(settingsResult.data?.voting_open));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const displayed = activeCategory === 'all' ? categories : categories.filter(c => c.id === activeCategory);
  const navTo = () => setMenu(false);

  return <>
    <header className="site-header">
      <a href="#inicio" className="site-brand" aria-label="Santa Cecilia Awards, inicio">
        <span className="site-monogram">SC<span>✦</span></span>
        <span className="brand-caption">SANTA CECILIA<br/>AWARDS <b>2026</b></span>
      </a>
      <nav className={menu ? 'site-nav open' : 'site-nav'} aria-label="Navegación principal">
        <a href="#premios" onClick={navTo}>Los premios</a>
        <a href="#nominados" onClick={navTo}>Nominados</a>
        <a href="#votacion" onClick={navTo}>Votaciones</a>
        <a className="nav-admin-mobile" href="/admin" onClick={navTo}><Shield size={15}/> Administración</a>
      </nav>
      <div className="header-actions">
        <a href="/admin" className="admin-access" title="Acceder al panel de administración"><LockKeyhole size={14}/> <span>Administración</span></a>
        <a href="#votacion" className="header-vote">LA VOTACIÓN <ArrowRight size={15}/></a>
      </div>
      <button className="menu-toggle" aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={23}/> : <Menu size={23}/>}</button>
    </header>

    <main id="inicio">
      <section className="opening">
        <div className="opening-grain" aria-hidden="true"/>
        <div className="opening-arc" aria-hidden="true"/>
        <div className="opening-body">
          <div className="edition-line"><span/> LA GRAN GALA DE LA BANDA <span/></div>
          <div className="opening-overline">Una celebración de lo extraordinariamente nuestro</div>
          <h1><span>Santa Cecilia</span><em>Awards</em></h1>
          <div className="opening-year"><span>EST.</span><strong>2026</strong><span>EDICIÓN</span></div>
          <p className="opening-description">Una noche para reconocer lo mejor, lo peor y lo absolutamente inolvidable de nuestra banda.</p>
          <div className="opening-buttons">
            <a className="gold-button" href="#premios">DESCUBRIR LOS PREMIOS <ArrowRight size={16}/></a>
            <a className="text-button" href="#nominados">VER NOMINADOS <ArrowRight size={14}/></a>
          </div>
        </div>
        <div className="opening-bottom"><span>✦ NO TODO ES MÚSICA ✦</span><a href="#premios">DESCUBRE LA GALA <ArrowDown size={15}/></a><span>SANTA CECILIA · 2026</span></div>
      </section>

      <section id="premios" className="prize-section">
        <div className="section-heading">
          <div className="eyebrow"><span>01</span> / LOS GALARDONES</div>
          <h2>Los premios de<br/><em>la noche.</em></h2>
          <p>Hay reconocimientos que se recuerdan durante años. Y otros que nadie deja que olvides.</p>
        </div>
        <div className="featured-prize">
          <div className="prize-visual principal">
            <div className="light-halo" aria-hidden="true"/>
            <div className="pedestal" aria-hidden="true"><div className="pedestal-top"/><div className="pedestal-base"/></div>
            <div className="trophy-symbol" aria-hidden="true">✋</div>
            <div className="visual-caption"><span>EL GRAN PREMIO</span><span>✦ 2026 ✦</span></div>
          </div>
          <div className="prize-copy">
            <span className="eyebrow gold-text">EL GALARDÓN MÁS CODICIADO</span>
            <span className="prize-index">N.º 01 / GRAN PREMIO</span>
            <h3>El Guante<br/><em>de Mickey.</em></h3>
            <p>{featured[0].description}</p>
            <div className="prize-divider"/>
            <span className="prize-meta">EL PROTAGONISTA ABSOLUTO DE LA GALA</span>
            <a href="#nominados" className="inline-link">DESCUBRIR LOS NOMINADOS <ArrowRight size={16}/></a>
          </div>
        </div>
        <div className="second-prize">
          <div className="second-copy">
            <span className="eyebrow gold-text">SEGUNDO GRAN GALARDÓN</span>
            <span className="prize-index">N.º 02 / REVELACIÓN</span>
            <h3>Cachorro<br/><em>del Año.</em></h3>
            <p>{featured[1].description}</p>
            <a href="#nominados" className="inline-link">CONOCER LA CATEGORÍA <ArrowRight size={16}/></a>
          </div>
          <div className="prize-visual secondary">
            <div className="light-halo" aria-hidden="true"/>
            <div className="trophy-symbol puppy-symbol" aria-hidden="true">♛</div>
            <div className="visual-caption"><span>NUEVA GENERACIÓN</span><span>✦ 2026 ✦</span></div>
          </div>
        </div>
        <p className="image-notice">Representaciones provisionales de los trofeos. Las fotografías oficiales se incorporarán próximamente.</p>
      </section>

      <section id="nominados" className="nominees-section">
        <div className="section-topline"><span>02 / LOS NOMINADOS</span><span>EDICIÓN 2026</span></div>
        <div className="nominees-heading"><span className="eyebrow gold-text">QUE COMIENCEN LAS APUESTAS</span><h2>Los elegidos.<br/><em>Las historias.</em></h2><p>Todos los premios y sus protagonistas, con sus mejores momentos en fotografías y vídeos.</p></div>
        {loading ? <div className="nominees-empty">Cargando categorías de la gala…</div> :
        categories.length ? <>
          <div className="category-filters" aria-label="Filtrar categorías">
            <button type="button" className={activeCategory === 'all' ? 'selected' : ''} onClick={() => setActiveCategory('all')}>TODAS LAS CATEGORÍAS</button>
            {categories.map(c => <button type="button" key={c.id} className={activeCategory === c.id ? 'selected' : ''} onClick={() => setActiveCategory(c.id)}>{c.title}</button>)}
          </div>
          <div className="category-list">{displayed.map((category, i) =>
            <article className="category-card" key={category.id}>
              <div className="category-header"><span>PREMIO {String(i+1).padStart(2, '0')}</span><span>{category.nominees.length ? category.nominees.length + ' NOMINADOS' : 'PENDIENTE DE REVELACIÓN'}</span></div>
              <h3>{category.title}</h3>
              {category.description && <p>{category.description}</p>}
              {category.nominees.length ? <div className="nominee-tiles">{category.nominees.map(n => <article className="nominee-tile" key={n.id}>
                <div className="nominee-media">{n.photo_url ? <img src={n.photo_url} alt={n.name} loading="lazy"/> : <Award size={30} strokeWidth={1}/>}</div>
                <div className="nominee-info"><strong>{n.name}</strong>{n.description && <p>{n.description}</p>}{n.video_url && <a href={n.video_url} target="_blank" rel="noopener noreferrer"><Film size={14}/> VER VÍDEO</a>}</div>
              </article>)}</div> : <div className="pending-nominees"><Sparkles size={18}/> Los nominados se anunciarán próximamente.</div>}
            </article>
          )}</div>
        </> : <div className="nominees-empty"><Award size={26}/><strong>Las nominaciones se están preparando.</strong><span>Muy pronto conocerás a todos los candidatos de la edición 2026.</span></div>}
      </section>

      <section id="votacion" className="voting-section">
        <div className="voting-frame">
          <span className="eyebrow gold-text">03 / EL VEREDICTO</span>
          <h2>La última palabra<br/><em>es tuya.</em></h2>
          <p>Una votación anónima, sin cuentas ni contraseñas para los participantes. Los resultados se guardarán para su revelación durante la gala.</p>
          <div className="voting-status"><LockKeyhole size={18}/>{votingOpen ? 'VOTACIÓN EN PREPARACIÓN' : 'VOTACIONES CERRADAS'}</div>
          <small>La papeleta anónima todavía no está disponible. No se están recogiendo votos.</small>
        </div>
      </section>
    </main>
    <footer className="site-footer">
      <div className="footer-brand"><strong>SC <span>✦</span> AWARDS</strong><small>SANTA CECILIA · EDICIÓN 2026</small></div>
      <p>Hecho para la banda, con mucho cariño y poca vergüenza.</p>
      <a href="/admin"><LockKeyhole size={13}/> Acceso administración</a>
    </footer>
  </>;
}

createRoot(document.getElementById('root')).render(window.location.pathname.replace(/\/$/, '') === '/admin' ? <Admin/> : <App/>);
