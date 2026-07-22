'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@arduino-lab/ui';
import { CalendarPlus, CircuitBoard, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import * as React from 'react';

import { useAuth } from '@/lib/auth-context';

const NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/booking/new', label: 'حجز موعد' },
  { href: '/my-bookings', label: 'حجوزاتي' },
];

export function SiteHeader() {
  const { user, isLoading, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <CircuitBoard className="text-primary size-6" aria-hidden />
          <span className="hidden sm:inline">معمل الأردوينو</span>
        </Link>

        <nav className="mx-4 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />

          {isLoading ? null : user ? (
            <UserMenu name={user.fullName} onLogout={() => void logout()} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">إنشاء حساب</Link>
              </Button>
            </div>
          )}

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="القائمة">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="end" className="w-64">
              <SheetHeader>
                <SheetTitle>القائمة</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className="justify-start"
                    asChild
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
                {!user ? (
                  <>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link href="/login">تسجيل الدخول</Link>
                    </Button>
                    <Button className="mt-2" asChild>
                      <Link href="/register">إنشاء حساب</Link>
                    </Button>
                  </>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  // Theme is unknown until hydration; rendering an icon before then would flash
  // the wrong one.
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

function UserMenu({ name, onLogout }: { name: string; onLogout: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-40">
          <User aria-hidden />
          <span className="truncate">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/booking/new">
            <CalendarPlus aria-hidden />
            حجز موعد جديد
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my-bookings">حجوزاتي</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onLogout}>
          <LogOut aria-hidden />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
