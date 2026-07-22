import type { Role } from '@arduino-lab/contracts';

export interface NavLink {
  href: string;
  label: string;
  icon: 'gauge' | 'calendar' | 'package' | 'clock' | 'chart' | 'users' | 'history';
  /** Roles allowed to see and open this section. */
  roles: Role[];
}

const STAFF: Role[] = ['ADMIN', 'TEACHING_TEAM'];
const ADMIN_ONLY: Role[] = ['ADMIN'];

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'نظرة عامة', icon: 'gauge', roles: STAFF },
  { href: '/bookings', label: 'الحجوزات', icon: 'calendar', roles: STAFF },
  { href: '/components', label: 'المكوّنات', icon: 'package', roles: STAFF },
  { href: '/slots', label: 'الفترات الزمنية', icon: 'clock', roles: STAFF },
  { href: '/reports', label: 'التقارير', icon: 'chart', roles: STAFF },
  { href: '/users', label: 'المستخدمون', icon: 'users', roles: ADMIN_ONLY },
  { href: '/audit-log', label: 'سجل التغييرات', icon: 'history', roles: ADMIN_ONLY },
];

export function linksForRole(role: Role): NavLink[] {
  return NAV_LINKS.filter((link) => link.roles.includes(role));
}
