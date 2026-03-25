// Single source of truth for all site-wide metadata.
// Every other file imports from here — never hardcode site metadata elsewhere.
export const site = {
  name: 'Signal Intelligence',
  shortName: 'Signal',
  url: 'https://v0-signal-intelligence-dashboard.vercel.app', // TODO: update to custom domain if added
  // Base description — used in <meta description>, manifest, JSON-LD
  description:
    'A personal system for consuming signal, capturing observations, and forming contrarian truths about the market.',
  // Used as the <title> tag (homepage + fallback) AND social card title.
  // Pattern: '[Site Name] — [5–7 word tagline describing the tool]'
  ogTitle: 'Signal Intelligence — Capture Signals, Form Contrarian Truths',
  ogDescription:
    'A personal system for consuming market signal, capturing observations, and forming contrarian truths. Built for solo analysts who think for themselves.',
  cta: 'Start observing →',
  founder: 'Luke Hanner',
  email: 'hello@modrynstudio.com',
  // Waitlist section copy — shown in the EmailSignup component.
  waitlist: {
    headline: 'What you spotted. What it means.',
    subheadline:
      'Observations and contrarian theses, delivered weekly. Train yourself to see what others miss.',
    success: "You're in. First digest hits your inbox soon.",
  },
  // Brand colors — used in manifest theme_color / background_color
  accent: '#4ade80', // green — primary action color
  bg: '#111111', // near-black background
  // Social profiles
  social: {
    twitter: 'https://x.com/lukehanner',
    twitterHandle: '@lukehanner',
    github: 'https://github.com/modryn-studio/signal-intelligence-dashboard',
    devto: 'https://dev.to/lukehanner',
    shipordie: 'https://shipordie.club/lukehanner',
  },
} as const;
