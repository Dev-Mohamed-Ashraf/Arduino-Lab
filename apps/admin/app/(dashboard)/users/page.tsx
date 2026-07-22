'use client';

import { ApiError, ROLE_LABELS_AR, type Role, type User } from '@arduino-lab/contracts';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@arduino-lab/ui';
import { formatShortDate, useAuth } from '@arduino-lab/web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserX } from 'lucide-react';
import * as React from 'react';

import { RequireStaff } from '@/components/require-staff';
import { api } from '@/lib/api';

export default function UsersPage() {
  return (
    <RequireStaff roles={['ADMIN']}>
      <UsersContent />
    </RequireStaff>
  );
}

function UsersContent() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = React.useState('');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['users', search],
    queryFn: () => api.users.list({ search: search || undefined, pageSize: 100 }),
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => api.users.updateRole(id, { role }),
    onSuccess: async () => {
      toast.success('تم تغيير الدور.');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'تعذّر تغيير الدور.');
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader title="المستخدمون" description="إدارة أدوار الحسابات." />

      <div className="relative max-w-md">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو البريد أو الرقم الجامعي…"
          className="ps-9"
          aria-label="ابحث عن مستخدم"
        />
      </div>

      {isError ? (
        <ErrorState description="تعذّر تحميل المستخدمين." onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : items.length === 0 ? (
        <EmptyState icon={<UserX />} title="لا يوجد مستخدمون" description="جرّب بحثًا آخر." />
      ) : (
        <>
          <Card className="hidden overflow-hidden py-0 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead className="w-24">الحجوزات</TableHead>
                  <TableHead className="w-28">التأكيد</TableHead>
                  <TableHead className="w-28">التسجيل</TableHead>
                  <TableHead className="w-48">الدور</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {user.email}
                    </TableCell>
                    <TableCell className="tabular-nums">{user.bookingsCount}</TableCell>
                    <TableCell>
                      <Badge variant={user.emailVerifiedAt ? 'success' : 'warning'}>
                        {user.emailVerifiedAt ? 'مؤكد' : 'غير مؤكد'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatShortDate(user.createdAt.slice(0, 10))}
                    </TableCell>
                    <TableCell>
                      <RoleSelect
                        user={user}
                        isSelf={user.id === currentUser?.id}
                        onChange={(role) => updateRole.mutate({ id: user.id, role })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {items.map((user) => (
              <Card key={user.id} className="gap-3 p-4">
                <div>
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-muted-foreground text-xs" dir="ltr">
                    {user.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={user.emailVerifiedAt ? 'success' : 'warning'}>
                    {user.emailVerifiedAt ? 'مؤكد' : 'غير مؤكد'}
                  </Badge>
                  <Badge variant="outline" className="tabular-nums">
                    {user.bookingsCount} حجز
                  </Badge>
                </div>
                <RoleSelect
                  user={user}
                  isSelf={user.id === currentUser?.id}
                  onChange={(role) => updateRole.mutate({ id: user.id, role })}
                />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RoleSelect({
  user,
  isSelf,
  onChange,
}: {
  user: User;
  isSelf: boolean;
  onChange: (role: Role) => void;
}) {
  return (
    <div className="space-y-1">
      <Select value={user.role} onValueChange={(value) => onChange(value as Role)} disabled={isSelf}>
        <SelectTrigger size="sm" aria-label={`دور ${user.fullName}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="STUDENT">{ROLE_LABELS_AR.STUDENT}</SelectItem>
          <SelectItem value="TEACHING_TEAM">{ROLE_LABELS_AR.TEACHING_TEAM}</SelectItem>
          <SelectItem value="ADMIN">{ROLE_LABELS_AR.ADMIN}</SelectItem>
        </SelectContent>
      </Select>
      {isSelf ? <p className="text-muted-foreground text-xs">لا يمكنك تغيير دورك.</p> : null}
    </div>
  );
}
