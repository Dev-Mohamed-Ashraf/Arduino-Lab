'use client';

import { Progress, cn } from '@arduino-lab/ui';
import { Check } from 'lucide-react';

import { WIZARD_STEPS } from './steps';

export function WizardProgress({ currentStep }: { currentStep: number }) {
  const percent = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold">{WIZARD_STEPS[currentStep]?.title}</p>
        <p className="text-muted-foreground text-sm tabular-nums">
          الخطوة {currentStep + 1} من {WIZARD_STEPS.length}
        </p>
      </div>

      <Progress value={percent} />

      {/* The full step list is meaningful on a wide screen and just noise on a
          phone, where the bar and the counter already say where you are. */}
      <ol className="hidden justify-between gap-1 lg:flex">
        {WIZARD_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              index === currentStep
                ? 'text-primary font-medium'
                : index < currentStep
                  ? 'text-success'
                  : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full border text-[10px] tabular-nums',
                index === currentStep && 'border-primary bg-primary text-primary-foreground',
                index < currentStep && 'border-success bg-success text-success-foreground',
              )}
              aria-hidden
            >
              {index < currentStep ? <Check className="size-3" /> : index + 1}
            </span>
            {step.title}
          </li>
        ))}
      </ol>
    </div>
  );
}
