// analytics.ts — event tracking stub
// Vercel Analytics (<Analytics /> in layout.tsx) handles pageviews automatically.
// Named methods are kept so call sites stay typed — swap in a provider here when needed.

type EventProps = Record<string, string | number | boolean | undefined>;

function track(_eventName: string, _props?: EventProps): void {
  // no-op — wire to Mixpanel/PostHog/etc. here if needed
}

export const analytics = {
  track,
  newsletterSignup: (props?: { source?: string }) => track('newsletter_signup', props),
  feedbackSubmit: () => track('feedback_submit'),
};
