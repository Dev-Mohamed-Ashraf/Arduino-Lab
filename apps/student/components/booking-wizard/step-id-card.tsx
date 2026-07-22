'use client';

import type { CreateBookingInput } from '@arduino-lab/contracts';
import { Alert, AlertDescription, Button, Card, Progress } from '@arduino-lab/ui';
import { ImageUp, RefreshCw, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { UploadError, assertAcceptable, uploadIdCard } from '@/lib/upload';

export function StepIdCard() {
  const { setValue, watch, formState } = useFormContext<CreateBookingInput>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const uploadedUrl = watch('idCardUrl');

  async function handleFile(file: File): Promise<void> {
    setError(null);

    try {
      assertAcceptable(file);
    } catch (assertionError) {
      setError(assertionError instanceof UploadError ? assertionError.message : 'ملف غير صالح.');
      return;
    }

    // Show the local file immediately; the network round trip can take a while
    // on lab wifi and a blank box reads as a broken form.
    setPreviewUrl(URL.createObjectURL(file));
    setProgress(0);

    try {
      const uploaded = await uploadIdCard(file, setProgress);
      setValue('idCardUrl', uploaded.url, { shouldValidate: true });
      setValue('idCardPublicId', uploaded.publicId, { shouldValidate: true });
    } catch (uploadError) {
      setPreviewUrl(null);
      setError(uploadError instanceof UploadError ? uploadError.message : 'فشل رفع الصورة.');
    } finally {
      setProgress(null);
    }
  }

  const shownImage = uploadedUrl || previewUrl;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        ارفع صورة واضحة لبطاقة الهوية الجامعية للطالب المسؤول عن المجموعة.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="اختيار صورة البطاقة"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = '';
        }}
      />

      {shownImage ? (
        <Card className="gap-3 p-4">
          <div className="bg-muted relative mx-auto aspect-[1.586/1] w-full max-w-sm overflow-hidden rounded-lg">
            {/* Blob previews and Cloudinary URLs both render fine unoptimised;
                next/image cannot optimise an object URL. */}
            <Image
              src={shownImage}
              alt="معاينة صورة البطاقة"
              fill
              unoptimized
              className="object-cover"
            />
          </div>

          {progress !== null ? (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-muted-foreground text-center text-xs tabular-nums">
                جارٍ الرفع… {progress}%
              </p>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
              <RefreshCw aria-hidden />
              تغيير الصورة
            </Button>
          )}
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border-input hover:border-primary/60 hover:bg-accent/40 focus-visible:ring-ring/50 flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <span className="bg-primary/10 text-primary grid size-14 place-items-center rounded-full">
            <ImageUp className="size-7" aria-hidden />
          </span>
          <span className="font-medium">اضغط لاختيار صورة البطاقة</span>
          <span className="text-muted-foreground text-xs">
            JPG أو PNG أو WEBP — بحد أقصى 5 ميجابايت
          </span>
        </button>
      )}

      {error ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {formState.errors.idCardUrl ? (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertDescription>{formState.errors.idCardUrl.message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
