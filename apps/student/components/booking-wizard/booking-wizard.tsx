'use client';

import { ApiError, createBookingSchema, type CreateBookingInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button, Card, toast } from '@arduino-lab/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm, type DefaultValues } from 'react-hook-form';

import { api } from '@/lib/api';
import { StepComponents } from './step-components';
import { StepGroup } from './step-group';
import { StepIdCard } from './step-id-card';
import { StepMembers } from './step-members';
import { StepProject } from './step-project';
import { StepReview } from './step-review';
import { StepSlot } from './step-slot';
import { WIZARD_STEPS, stepIndexForErrorCode } from './steps';
import { useBookingDraft } from './use-booking-draft';
import { WizardProgress } from './wizard-progress';

// Must stay in the same order as WIZARD_STEPS.
const STEP_COMPONENTS = [
  StepGroup,
  StepMembers,
  StepIdCard,
  StepProject,
  StepSlot,
  StepComponents,
  StepReview,
];

/** Every field starts controlled so React never warns about the switch. */
const EMPTY_DRAFT: DefaultValues<CreateBookingInput> = {
  members: [{ fullName: '', studentCode: '' }],
  components: [],
  bookingDate: '',
  timeSlotId: '',
  idCardUrl: '',
  idCardPublicId: '',
  projectTitle: '',
  projectDescription: '',
  notes: '',
};

export function BookingWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    mode: 'onTouched',
    defaultValues: EMPTY_DRAFT,
  });

  const { clear: clearDraft } = useBookingDraft(form);
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const StepBody = STEP_COMPONENTS[currentStep] ?? StepGroup;

  async function goNext(): Promise<void> {
    const fields = WIZARD_STEPS[currentStep]?.fields ?? [];
    const isValid = await form.trigger(fields, { shouldFocus: true });
    if (!isValid) return;

    setSubmitError(null);
    setCurrentStep((step) => Math.min(step + 1, WIZARD_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack(): void {
    setSubmitError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const booking = await api.bookings.create(values);
      clearDraft();
      // Slot occupancy and stock both changed; anything cached is now stale.
      await queryClient.invalidateQueries();
      toast.success('تم تأكيد الحجز بنجاح.');
      router.push(`/booking/${booking.bookingNumber}`);
    } catch (error) {
      handleSubmitFailure(error);
    }
  });

  function handleSubmitFailure(error: unknown): void {
    if (!(error instanceof ApiError)) {
      setSubmitError('حدث خطأ غير متوقع. حاول مرة أخرى.');
      return;
    }

    setSubmitError(error.message);

    // Send the user back to the step that owns the problem, with fresh numbers.
    const targetStep = stepIndexForErrorCode(error.code);
    if (targetStep !== null) {
      void queryClient.invalidateQueries();
      setCurrentStep(targetStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <WizardProgress currentStep={currentStep} />

        {submitError ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="p-5 sm:p-6">
          <StepBody />
        </Card>

        <div className="bg-background/95 sticky bottom-0 flex gap-3 border-t py-4 backdrop-blur">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={goBack}
            disabled={currentStep === 0 || form.formState.isSubmitting}
            className="flex-1 sm:flex-initial"
          >
            {/* Not flipped: in RTL the start edge is the right one, so "back"
                already points the correct way. */}
            <ChevronRight aria-hidden />
            السابق
          </Button>

          {isLastStep ? (
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              isLoading={form.formState.isSubmitting}
            >
              تأكيد الحجز
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={() => void goNext()} className="flex-1">
              التالي
              <ChevronLeft aria-hidden />
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
