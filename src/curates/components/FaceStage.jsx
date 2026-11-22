// The featured character, recoloured live. Four photos (full face + lip, cheek and eye close-ups)
// are stacked; the visible one cross-fades with a scale so switching feels like zooming in.
// Each area is two masked layers from recolour.js (lightness, then colour) over the photo.
import { SCENES, SCENE_FOR_AREA, layerStyles, maskFile, sceneTargets } from '../../lib/recolour';
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

// Step 1: the user's own colouring only (products arrive in step 2).
function sceneLayers(key, user, defaults) {
  const sampled = sampledColours[key];
  const t = sceneTargets(sampled, user, defaults);
  return {
    skin: layerStyles(sampled.skin, t.skin, 0.85),
    lips: layerStyles(sampled.lips, t.lips, 0.95),
  };
}

function Scene({ id, visible, user, defaults }) {
  const s = SCENES[id];
  const layers = sceneLayers(id, user, defaults);
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

export default function FaceStage({ area, zoomed, onToggleZoom, user, defaults }) {
  const visible = zoomed ? SCENE_FOR_AREA[area] : 'base';
  const chipHex = area === 'lips' ? user.lips : user.skin;
  const where = zoomed ? `a close-up of the ${AREA_LABEL[area].toLowerCase()}` : 'the full face';
  return (
    <div className="cu-stage">
      <div className="cu-stage__glow" aria-hidden="true" />
      <div className="cu-stage__scenes" role="img"
        aria-label={`Model showing ${where}, matched to your skin ${user.skin} and lips ${user.lips}`}>
        {Object.keys(SCENES).map((id) => <Scene key={id} id={id} visible={id === visible} user={user} defaults={defaults} />)}
      </div>
      <div className="cu-stage__shade" aria-hidden="true" />

      <div className="cu-stage__top">
        <span className="cu-stage__tag" aria-hidden="true">{AREA_LABEL[area].toUpperCase()} · YOUR COLOUR</span>
        <button type="button" className="cu-stage__btn" onClick={onToggleZoom}>{zoomed ? 'Full face' : 'Zoom in'}</button>
      </div>
      <div className="cu-stage__bottom" aria-hidden="true">
        <span className="cu-stage__chip">
          <span className="cu-stage__dot" style={{ background: chipHex }} />
          <span className="cu-stage__hex">{area === 'lips' ? 'Lips' : 'Skin'} {chipHex}</span>
        </span>
      </div>
    </div>
  );
}
