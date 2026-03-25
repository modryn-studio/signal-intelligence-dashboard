'use client';

import { MessageSquare } from 'lucide-react';

/**
 * FeedbackTrigger — mobile footer button that opens the FeedbackWidget sheet.
 * Communicates via a custom DOM event ('feedback:open') listened to in FeedbackWidget.
 *
 * Wire into layout.tsx footer or any mobile-specific area:
 *   import { FeedbackTrigger } from '@/components/feedback-trigger';
 *   <FeedbackTrigger />
 */
export function FeedbackTrigger() {
  const open = () => window.dispatchEvent(new Event('feedback:open'));

  return (
    <button
      onClick={open}
      className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Open feedback"
    >
      <MessageSquare size={13} />
      Feedback
    </button>
  );
}
