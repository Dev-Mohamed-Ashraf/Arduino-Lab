import { RequireStaff } from '@/components/require-staff';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RequireStaff>{children}</RequireStaff>;
}
