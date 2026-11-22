// Plain-English privacy note. Shown inside the sign-up sheet and on /privacy.
// The website has no privacy page yet, so this is the app's own notice.
// Kept short: what we keep, why, emails, and how to reach us (PDPA basics).

export const PRIVACY_EMAIL = 'hello@veu-alchemist.com';

export default function PrivacyNote({ compact = false }) {
  const H = compact ? 'h4' : 'h2';
  return (
    <div className={`cu-privacy${compact ? ' cu-privacy--compact' : ''}`}>
      <H>What we keep</H>
      <p>Your name, email, undertone lean and the shades you like. Instagram and colour-analysis history only if you add them.</p>
      <H>Why</H>
      <p>We want to constantly improve our app to ensure that YOU get the best recommendations, tailored to your preferences.</p>
      <H>Emails</H>
      <p>Only if you switch them on. Reply &ldquo;unsubscribe&rdquo; any time to stop them.</p>
      <H>Your choice</H>
      <p>We never sell your details. To see, change or delete them, email us at <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</p>
    </div>
  );
}
