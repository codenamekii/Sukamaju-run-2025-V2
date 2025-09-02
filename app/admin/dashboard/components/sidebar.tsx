"use client";

import {
  Activity,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Mail,
  Menu,
  Package,
  QrCode,
  Settings,
  Ticket,
  Users,
  X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'Participants',
    href: '/admin/dashboard/participants',
    icon: Users
  },
  {
    name: 'Registrations',
    href: '/admin/dashboard/registrations',
    icon: Ticket
  },
  {
    name: 'Payments',
    href: '/admin/dashboard/payments',
    icon: CreditCard
  },
  {
    name: 'Check-In',
    href: '/admin/dashboard/checkin',
    icon: QrCode
  },
  {
    name: 'Racepack',
    href: '/admin/dashboard/racepacks',
    icon: Package
  },
  {
    name: 'Communications',
    href: '/admin/dashboard/communications',
    icon: Mail
  },
  {
    name: 'Reports',
    href: '/admin/dashboard/reports',
    icon: BarChart3
  },
  {
    name: 'Analytics',
    href: '/admin/dashboard/analytics',
    icon: Activity
  },
  {
    name: 'Settings',
    href: '/admin/dashboard/settings',
    icon: Settings
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Get admin info from localStorage or session
    const storedAdmin = localStorage.getItem('adminName');
    if (storedAdmin) setAdminName(storedAdmin);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-16 border-b px-6 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <h2 className="font-bold text-gray-800">SUKAMAJU RUN</h2>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">{adminName[0]}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{adminName}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}