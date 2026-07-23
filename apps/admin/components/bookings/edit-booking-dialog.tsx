'use client';

import {
  ApiError,
  MAX_GROUP_MEMBERS,
  type ComponentRequest,
  type UpdateBookingInput,
} from '@arduino-lab/contracts';
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
  Skeleton,
  Textarea,
  toast,
} from '@arduino-lab/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

import { api } from '@/lib/api';
import { ComponentPicker } from './component-picker';

interface DraftMember {
  fullName: string;
  studentCode: string;
}

/**
 * Admin edit form.
 *
 * Covers the fields that change in practice: group number, project text, members
 * and components. Moving a booking to another period is a different operation
 * with its own capacity checks, so it lives in MoveBookingDialog.
 */
export function EditBookingDialog({
  bookingNumber,
  onOpenChange,
}: {
  bookingNumber: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{
    groupNumber: string;
    projectTitle: string;
    projectDescription: string;
    members: DraftMember[];
    components: ComponentRequest[];
  } | null>(null);

  const { data: booking, isPending } = useQuery({
    queryKey: ['booking', bookingNumber],
    queryFn: () => api.bookings.getByNumber(bookingNumber ?? ''),
    enabled: Boolean(bookingNumber),
  });

  React.useEffect(() => {
    if (!booking) return;
    setError(null);
    setDraft({
      groupNumber: String(booking.groupNumber),
      projectTitle: booking.projectTitle,
      projectDescription: booking.projectDescription,
      members: booking.members.map((member) => ({
        fullName: member.fullName,
        studentCode: member.studentCode ?? '',
      })),
      components: booking.components.map((item) => ({
        componentId: item.componentId,
        quantity: item.quantity,
      })),
    });
  }, [booking]);

  const save = useMutation({
    mutationFn: (input: UpdateBookingInput) => api.bookings.update(booking?.id ?? '', input),
    onSuccess: async () => {
      toast.success('تم حفظ التعديلات.');
      await queryClient.invalidateQueries();
      onOpenChange(false);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : 'تعذّر حفظ التعديلات.');
    },
  });

  function submit(): void {
    if (!draft) return;
    setError(null);

    save.mutate({
      groupNumber: Number(draft.groupNumber),
      projectTitle: draft.projectTitle,
      projectDescription: draft.projectDescription,
      members: draft.members.map((member) => ({
        fullName: member.fullName,
        studentCode: member.studentCode,
      })),
      components: draft.components,
    });
  }

  return (
    <Dialog open={Boolean(bookingNumber)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>تعديل الحجز</DialogTitle>
          <DialogDescription>
            الكميات المعروضة هي المتاح في فترة الحجز نفسها. لنقل الحجز لفترة أخرى استخدم زر النقل.
          </DialogDescription>
        </DialogHeader>

        {isPending || !draft || !booking ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="groupNumber">رقم المجموعة</Label>
              <Input
                id="groupNumber"
                type="number"
                min={1}
                value={draft.groupNumber}
                onChange={(event) => setDraft({ ...draft, groupNumber: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="projectTitle">اسم المشروع</Label>
              <Input
                id="projectTitle"
                value={draft.projectTitle}
                onChange={(event) => setDraft({ ...draft, projectTitle: event.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="projectDescription">وصف المشروع</Label>
              <Textarea
                id="projectDescription"
                rows={3}
                value={draft.projectDescription}
                onChange={(event) => setDraft({ ...draft, projectDescription: event.target.value })}
              />
            </div>

            <Separator />

            <MembersEditor
              members={draft.members}
              onChange={(members) => setDraft({ ...draft, members })}
            />

            <Separator />

            <div className="space-y-2">
              <Label>المكوّنات</Label>
              <ComponentPicker
                value={draft.components}
                alreadyHeld={
                  new Map(booking.components.map((item) => [item.componentId, item.quantity]))
                }
                bookingDate={booking.bookingDate.slice(0, 10)}
                timeSlotId={booking.timeSlot.id}
                onChange={(components) => setDraft({ ...draft, components })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button disabled={!draft} isLoading={save.isPending} onClick={submit}>
            حفظ التعديلات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersEditor({
  members,
  onChange,
}: {
  members: DraftMember[];
  onChange: (members: DraftMember[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>
          أعضاء المجموعة (<span className="tabular-nums">{members.length}</span> /{' '}
          {MAX_GROUP_MEMBERS})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={members.length >= MAX_GROUP_MEMBERS}
          onClick={() => onChange([...members, { fullName: '', studentCode: '' }])}
        >
          <Plus aria-hidden />
          إضافة
        </Button>
      </div>

      <ul className="space-y-2">
        {members.map((member, index) => (
          <li key={index} className="flex items-center gap-2">
            <Input
              value={member.fullName}
              aria-label={`اسم الطالب ${index + 1}`}
              onChange={(event) =>
                onChange(
                  members.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, fullName: event.target.value } : row,
                  ),
                )
              }
            />
            <Input
              value={member.studentCode}
              dir="ltr"
              className="text-start sm:w-40"
              aria-label={`الرقم الجامعي للطالب ${index + 1}`}
              onChange={(event) =>
                onChange(
                  members.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, studentCode: event.target.value } : row,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`حذف الطالب ${index + 1}`}
              disabled={members.length === 1}
              onClick={() => onChange(members.filter((_, rowIndex) => rowIndex !== index))}
            >
              <Trash2 className="text-destructive" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
