'use client';

import type { CurrentUser } from '@arduino-lab/contracts';
import { ROLE_LABELS_AR } from '@arduino-lab/contracts';
import {
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  cn,
} from '@arduino-lab/ui';
import { useAuth } from '@arduino-lab/web';
import {
  BarChart3,
  CalendarDays,
  CircuitBoard,
  Clock,
  Gauge,
  History,
  LogOut,
  Menu,
  Moon,
  Package,
  Sun,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { linksForRole, type NavLink } from './nav-links';

const ICONS: Record<NavLink['icon'], React.ComponentType<{ className?: string }>> = {
  gauge: Gauge,
  calendar: CalendarDays,
  package: Package,
  clock: Clock,
  chart: BarChart3,
  users: Users,
  history: History,
};

export function AdminShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const links = linksForRole(user.role);

  return (
    <div className="flex min-h-dvh">
      {/* Docked from lg up; below that the same list lives inside the sheet. */}
      <aside className="bg-card hidden w-64 shrink-0 border-e lg:flex lg:flex-col">
        <Brand />
        <Separator />
        <NavList links={links} className="flex-1 p-3" />
        <Separator />
        <UserPanel user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 backdrop-blur lg:justify-end">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="القائمة">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="end" className="w-72 p-0">
              <SheetHeader className="p-0">
                <SheetTitle className="sr-only">قائمة التنقّل</SheetTitle>
                <Brand />
              </SheetHeader>
              <Separator />
              <NavList
                links={links}
                className="p-3"
                onNavigate={() => setIsMenuOpen(false)}
              />
              <Separator />
              <UserPanel user={user} />
            </SheetContent>
          </Sheet>

          <span className="font-semibold lg:hidden">لوحة التحكم</span>

          <div className="ms-auto lg:ms-0">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2 px-4">
      <CircuitBoard className="text-primary size-6" aria-hidden />
      <span className="font-bold">معمل الأردوينو</span>
    </div>
  );
}

function NavList({
  links,
  className,
  onNavigate,
}: {
  links: NavLink[];
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {links.map((link) => {
        const Icon = ICONS[link.icon];
        const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserPanel({ user }: { user: CurrentUser }) {
  const { logout } = useAuth();

  return (
    <div className="space-y-2 p-3">
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-medium">{user.fullName}</p>
        <p className="text-muted-foreground truncate text-xs">{ROLE_LABELS_AR[user.role]}</p>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={() => void logout()}>
        <LogOut aria-hidden />
        تسجيل الخروج
      </Button>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => setIsMounted(true), []);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="تبديل المظهر"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {isMounted && resolvedTheme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  );
}
