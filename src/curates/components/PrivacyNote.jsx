// Plain-English privacy note. Shown inside the sign-up sheet and on /privacy.
// The website has no privacy page yet, so this is the app's own notice.
// TODO(VEU): confirm the contact route for data requests and have the founder review this copy.

export const PRIVACY_CONTACT = 'through the contact form on veu-alchemist.com';

export default function PrivacyNote({ compact = false }) {
  const H = compact ? 'h4' : 'h2';
  return (
    <div className={`cu-privacy${compact ? ' cu-privacy--compact' : ''}`}>
      <H>What we keep</H>
      <p>Your first name and email. Your Instagram and whether you've had a colour analysis, only if you add them. Your undertone lean and the shades you like.</p>
      <H>Why</H>
      <p>To save your picks so they're here next time, and to learn which shades people love so we can recommend better ones. We also note which screens and shades you tap, only to improve the app.</p>
      <H>Emails</H>
      <p>Only if you switch on colour tips. It's off unless you turn it on, and you can turn it off any time.</p>
      <H>What we never do</H>
      <p>We never sell your details. We never ask for photos of you. Your season is found in person at a VEU consultation, not by the app.</p>
      <H>Your choice</H>
      <p>Want to see, change or delete what we hold? Message us {PRIVACY_CONTACT} and we'll sort it out.</p>
    </div>
  );
}
