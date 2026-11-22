// The featured character, recoloured live. Four photos (full face + lip, cheek and eye close-ups)
// are stacked; the visible one cross-fades with a scale so switching feels like zooming in.
// Each area is two masked layers from recolour.js (lightness, then colour) over the photo.
import { SCENES, SCENE_FOR_AREA, maskFile, sceneLayers } from '../../lib/recolour';
import sampledColours from '../../../public/character/sampled-colours.json';

const BASE = '/character/';
const AREA_LABEL = { lips: 'Lips', cheeks: 'Cheeks', eyes: 'Eyes' };

const maskStyle = (scene, area) => {
  const url = `url(${BASE}masks/${maskFile(scene, area)})`;
  return {
    WebkitMaskImage: url, maskImage: url,
    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
  };
};

function Scene({ id, visible, current, defaults }) {
  const s = SCENES[id];
  const layers = sceneLayers(sampledColours[id], current, defaults);
  return (
    <div className={`scene cu-scene cu-scene--${id === 'base' ? 'portrait' : 'close'}${visible ? ' is-on' : ''}`} aria-hidden="true">
      <div className="cu-scene__frame">
        <img src={`${BASE}${s.img}`} alt="" width={s.w} height={s.h} draggable="false" />
        {s.areas.filter((a) => layers[a]).map((a) => (
          <div key={a}>
            <div className="cu-scene__layer" style={{ ...maskStyle(id, a), ...layers[a].lightness }} />
            <div className="cu-scene__layer" style={{ ...maskStyle(id, a), ...layers[a].colour }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// current / defaults: colour per area { skin, lips, cheeks, eyes }. chip: { hex, label } shown bottom left.
export default function FaceStage({ area, zoomed, onToggleZoom, current, defaults, label, chip }) {
  const visible = zoomed ? SCENE_FOR_AREA[area] : 'base';
  const where = zoomed ? `a close-up of the ${AREA_LABEL[area].toLowerCase()}` : 'the full face';
  return (
    <div className="cu-stage">
      <div className="cu-stage__glow" aria-hidden="true" />
      <div className="cu-stage__scenes" role="img" aria-label={`Model showing ${where}. ${label}`}>
        {Object.keys(SCENES).map((id) => <Scene key={id} id={id} visible={id === visible} current={current} defaults={defaults} />)}
      </div>
      <div className="cu-stage__shade" aria-hidden="true" />

      <div className="cu-stage__top">
        <span className="cu-stage__tag" aria-hidden="true">{AREA_LABEL[area].toUpperCase()} · ON YOU</span>
        <button type="button" className="cu-stage__btn" onClick={onToggleZoom}>{zoomed ? 'Full face' : 'Zoom in'}</button>
      </div>
      <div className="cu-stage__bottom" aria-hidden="true">
        <span className="cu-stage__chip">
          <span className="cu-stage__dot" style={{ background: chip.hex }} />
          <span className="cu-stage__hex">{chip.text}</span>
        </span>
      </div>
    </div>
  );
}
