import { PrintReceipt } from '@/components/print/print-receipt';
import { RequireAuth } from '@/components/require-auth';

export default async function PrintPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = await params;

  // Same access rule as the on-screen receipt: only the owner or staff may load
  // it. The endpoint enforces this too; this just avoids rendering a shell for
  // someone who will get a 403.
  return (
    <RequireAuth>
      <PrintReceipt bookingNumber={bookingNumber} />
    </RequireAuth>
  );
}
