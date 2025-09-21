"use client";

import {
  Activity,
  BarChart3,
  ChevronDown,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  LucideIcon,
  Mail,
  Menu,
  Package,
  QrCode,
  Settings,
  Shield,
  Ticket,
  Trophy,
  Upload,
  UserCog,
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
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    name: 'Participants',
    href: '/admin/dashboard/participants',
    icon: Users,
    children: [
      { name: 'All Participants', href: '/admin/dashboard/participants', icon: Users },
      { name: 'Communities', href: '/admin/dashboard/participants/communities', icon: Trophy },
    ]
  },
  {
    name: 'Import',
    href: '/admin/dashboard/import',
    icon: Upload
  },
  {
    name: 'Registrations',
    href: '/admin/dashboard/registrations',
    icon: Ticket,
    children: [
      { name: 'Manage Registrations', href: '/admin/dashboard/registrations', icon: Ticket },
      { name: 'Promo & Discounts', href: '/admin/dashboard/promotions', icon: CreditCard },
    ]
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
    icon: Mail,
    children: [
      { name: 'Send Messages', href: '/admin/dashboard/communications', icon: Mail },
      { name: 'Templates', href: '/admin/dashboard/communications/templates', icon: FileText },
    ]
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
    icon: Settings,
    children: [
      { name: 'General', href: '/admin/dashboard/settings', icon: Settings },
      { name: 'Users', href: '/admin/dashboard/settings/users', icon: UserCog },
      { name: 'Roles', href: '/admin/dashboard/settings/roles', icon: Shield },
      { name: 'Audit Log', href: '/admin/dashboard/settings/audit', icon: History },
    ]
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Check auth status
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/check');
      if (!response.ok) {
        router.push('/admin/login');
      } else {
        const data = await response.json();
        setAdminName(data.name || 'Admin');
      }
    } catch {
      router.push('/admin/login');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const toggleExpanded = (name: string) => {
    setExpandedMenus(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Backdrop */}
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <h2 className="font-bold text-gray-800">SUKAMAJU RUN</h2>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
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
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${isActive(item.href) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus.includes(item.name) ? 'rotate-180' : ''
                        }`} />
                    </button>
                    {expandedMenus.includes(item.name) && (
                      <ul className="mt-1 ml-6 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`
                                flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                                ${isActive(child.href) ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}
                              `}
                            >
                              <child.icon className="w-3 h-3" />
                              <span>{child.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(item.href) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}
                    `}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
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

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}