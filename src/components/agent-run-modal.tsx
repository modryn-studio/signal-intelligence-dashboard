'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

type StepStatus = 'pending' | 'active' | 'done';

interface Step {
  label: string;
  detail: string;
}

const STEPS: Step[] = [
  { label: 'Fetching signals', detail: 'HN · Product Hunt · Indie Hackers · Reddit' },
  { label: 'Filtering with Claude', detail: "Matching against today's question" },
  { label: 'Logging results', detail: 'Saving to your feed' },
];

// Approximate timing of what the backend actually does.
// Step advances at these offsets (ms) unless the response arrives first.
const STEP_ADVANCE_AT = [0, 6000, 22000];

function StepRow({ step, status }: { step: Step; status: StepStatus }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {status === 'done' ? (
          <CheckIcon className="text-accent h-4 w-4" />
        ) : status === 'active' ? (
          <Spinner className="text-accent h-3.5 w-3.5" />
        ) : (
          <span className="border-border h-2 w-2 rounded-full border" />
        )}
      </div>
      <div>
        <p
          className={`font-mono text-sm leading-none ${
            status === 'pending' ? 'text-muted-foreground/50' : 'text-foreground'
          }`}
        >
          {step.label}
        </p>
        {status !== 'pending' && (
          <p className="text-muted-foreground mt-1 font-mono text-[11px]">{step.detail}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  question: string;
  onClose: () => void;
  onRun: () => Promise<{ logged: number }>;
  onDeepEvaluate?: () => void;
}

export function AgentRunModal({ open, question, onClose, onRun, onDeepEvaluate }: Props) {
  const [stepIndex, setStepIndex] = useState(0); // which step is currently active
  const [result, setResult] = useState<{ logged: number } | null>(null);
  const [error, setError] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Reset and kick off run each time modal opens
  useEffect(() => {
    if (!open) return;

    setResult(null);
    setError(false);
    setStepIndex(0);

    // Schedule timed step advances
    const t1 = setTimeout(() => setStepIndex((s) => Math.max(s, 1)), STEP_ADVANCE_AT[1]);
    const t2 = setTimeout(() => setStepIndex((s) => Math.max(s, 2)), STEP_ADVANCE_AT[2]);
    timersRef.current = [t1, t2];

    onRun()
      .then((data) => {
        timersRef.current.forEach(clearTimeout);
        setStepIndex(STEPS.length); // all steps done
        setResult(data);
      })
      .catch(() => {
        timersRef.current.forEach(clearTimeout);
        setError(true);
      });

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isDone = result !== null;
  const isRunning = !isDone && !error;

  const stepStatuses: StepStatus[] = STEPS.map((_, i) => {
    if (i < stepIndex) return 'done';
    if (i === stepIndex && isRunning) return 'active';
    return 'pending';
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && isDone) onClose();
      }}
    >
      <DialogContent showCloseButton={isDone || error} className="max-w-sm gap-0 p-6">
        <DialogTitle className="sr-only">Run Agent</DialogTitle>
        {/* Question */}
        <div className="border-border mb-5 border-b pb-4">
          <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-widest uppercase">
            Today&apos;s question
          </p>
          <p className="text-foreground text-sm leading-snug italic">&ldquo;{question}&rdquo;</p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <StepRow key={step.label} step={step} status={stepStatuses[i]} />
          ))}
        </div>

        {/* Result / error */}
        {isDone && (
          <div className="border-border mt-5 border-t pt-4">
            <p className="text-accent font-mono text-sm">
              {result!.logged === 0
                ? 'No new signals matched today.'
                : `${result!.logged} signal${result!.logged === 1 ? '' : 's'} logged.`}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {onDeepEvaluate && result!.logged > 0 && (
                <Button
                  onClick={() => {
                    onClose();
                    onDeepEvaluate();
                  }}
                  size="sm"
                  className="w-full font-mono text-xs tracking-wider"
                >
                  &rarr; Deep evaluate
                </Button>
              )}
              <Button
                onClick={onClose}
                size="sm"
                variant={onDeepEvaluate && result!.logged > 0 ? 'outline' : 'default'}
                className="w-full font-mono text-xs tracking-wider"
              >
                View signals
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="border-border mt-5 border-t pt-4">
            <p className="text-destructive font-mono text-sm">
              Something went wrong. Refresh and try again.
            </p>
            <Button
              onClick={onClose}
              size="sm"
              variant="outline"
              className="mt-3 w-full font-mono text-xs tracking-wider"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
