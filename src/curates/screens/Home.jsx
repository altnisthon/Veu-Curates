import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../lib/useScrollReveal';
import { SKIN_RAMP, LIP_RAMP, LOOKS } from '../../lib/colour';
import { Breadcrumb, MeButton } from '../components/Chrome';
import { LEAN_OPTIONS } from '../lib/leans';
import { usePrefs } from '../lib/prefs';
import { track } from '../lib/track';

function Reveal({ as: Tag = 'section', className = '', children, ...rest }) {
  const ref = useScrollReveal();
  return <Tag ref={ref} className={`reveal ${className}`} {...rest}>{children}</Tag>;
}

function Step({ n, title, text, children, extra }) {
  return (
    <Reveal className="glass cu-step" aria-labelledby={`step-${n}`}>
      <span className="cu-step__n">STEP 0{n}</span>
      <h3 id={`step-${n}`}>{title}</h3>
      <p className="cu-muted">{text}</p>
      <div className="cu-step__demo">{children}</div>
      {extra}
    </Reveal>
  );
}

const ramp = (stops) => ({ background: `linear-gradient(90deg, ${stops.join(', ')})` });

export default function Home() {
  const { prefs, update } = usePrefs();
  const look = prefs.look ?? 1;

  return (
    <div className="cu-home">
      <div className="cu-hero">
        {/* Placeholder until the Soul Cinema hero image is ready. */}
        <div className="cu-hero__top">
          <div className="cu-header__titles">
            <span className="cu-brand">VEU Curates</span>
            <Breadcrumb trail={[{ label: 'Home', to: '/' }]} />
          </div>
          <MeButton />
        </div>
        <div className="cu-hero__bottom">
          <p className="cu-hero__quote">colour is science. wearing it well is art.</p>
          <span className="cu-hero__hint">Scroll to get started
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4.5 6 8.5l4-4" /></svg>
          </span>
        </div>
      </div>

      <div className="cu-stack">
        <Reveal as="div" className="cu-intro">
          <h2>How to get started</h2>
          <p className="cu-muted">Five steps to the shades that work on you.</p>
        </Reveal>

        <Step n={1} title="Tell us your undertone" text="Do you lean warm, cool or neutral? Go with your gut. You can change it any time.">
          <div className="cu-chips" role="radiogroup" aria-label="Undertone lean">
            {LEAN_OPTIONS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={prefs.lean === o.id}
                className={`cu-chip${prefs.lean === o.id ? ' is-on' : ''}`} onClick={() => { update({ lean: o.id }); track('lean_picked', { lean: o.id, source: 'home' }); }}>{o.label}</button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Pick the looks you like" text="Natural, everyday or bold. We match shades to the look you actually wear.">
          <div className="cu-chips" role="radiogroup" aria-label="Look">
            {LOOKS.map((l, i) => (
              <button key={l} type="button" role="radio" aria-checked={look === i}
                className={`cu-chip${look === i ? ' is-on' : ''}`} onClick={() => update({ look: i })}>{l}</button>
            ))}
          </div>
        </Step>

        <Step n={3} title="Match your skin and lips" text="Slide until the face in Studio looks like you, so every shade shows as it would on you.">
          <div className="cu-ramps" aria-hidden="true">
            <div className="cu-ramp"><span>Skin</span><span className="cu-ramp__bar" style={ramp(SKIN_RAMP)}><span className="cu-ramp__knob" style={{ left: '40%' }} /></span></div>
            <div className="cu-ramp"><span>Lips</span><span className="cu-ramp__bar" style={ramp(LIP_RAMP)}><span className="cu-ramp__knob" style={{ left: '50%' }} /></span></div>
          </div>
        </Step>

        <Step n={4} title="Explore products to try" text="Lips, blush and eyes, shown as they would look on you, not in the pan.">
          <div className="cu-chips" aria-hidden="true">
            {[['Lip tint', '#C9564F'], ['Blush', '#E7A08F'], ['Eyeshadow', '#A88267'], ['Lipstick', '#9E3459']].map(([l, c]) => (
              <span key={l} className="cu-pill"><span className="cu-dot" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </Step>

        <Step n={5} title="See the colour science" text="Every shade gets a fit score based on lightness, chroma and undertone, with a plain-English reason."
          extra={<Link to="/learn" className="cu-link">Learn more about colour science</Link>}>
          <div className="cu-score">
            <span className="cu-score__swatch" style={{ background: '#C76A55' }} aria-hidden="true" />
            <div>
              <span className="cu-score__verdict">Strong match · 88</span>
              <span className="cu-score__nums"><span>L 59</span><span>C 45</span><span>h 31°</span><span>ΔE 13</span></span>
              <span className="cu-score__plain">How light it is, how strong the colour is, where it sits on the colour wheel, and how much it shows up on you.</span>
            </div>
          </div>
        </Step>

        <Reveal as="div" className="cu-closing">
          <p className="cu-closing__line">who says science isn't fun? happy exploring, you're the next work of art.</p>
          <Link to="/undertone" className="btn-primary cu-btn">Get started</Link>
        </Reveal>
      </div>
    </div>
  );
}
