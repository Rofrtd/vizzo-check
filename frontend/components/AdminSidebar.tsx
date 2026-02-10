'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const agenciesMenuItem: MenuItem = {
  title: 'Agências',
  href: '/admin/agencies',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
};

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const isSystemAdmin = user?.role === 'system_admin';

  function handleLogout() {
    logout();
    router.push('/admin/login');
  }

  const menuItems: MenuItem[] = [
    ...(isSystemAdmin ? [agenciesMenuItem] : []),
    {
      title: 'Dashboard',
      href: '/admin/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      title: 'Visitas',
      href: '/admin/visits',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      title: 'Promotores',
      href: '/admin/promoters',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: 'Marcas',
      href: '/admin/brands',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      )
    },
    {
      title: 'Lojas',
      href: '/admin/stores',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      title: 'Alocações',
      href: '/admin/allocations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'Relatórios',
      href: '/admin/financial',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href;
    }
    if (href === '/admin/agencies') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200 hover:bg-gray-50 transition"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
          border-r border-gray-700/50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          w-64
          flex flex-col
          shadow-2xl
          backdrop-blur-sm
        `}
        style={{
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3), inset -1px 0 0 rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-700/50 relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 animate-pulse" />
          <div className="relative flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/50 relative overflow-hidden group">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/50 to-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                VizzoCheck
              </h1>
              <p className="text-xs text-gray-400 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  group relative flex items-center space-x-3 px-4 py-3 rounded-lg
                  transition-all duration-300
                  ${active
                    ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 scale-[1.02]'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50 hover:scale-[1.01]'
                  }
                `}
              >
                {/* Active indicator with glow */}
                {active && (
                  <>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-white to-blue-300 rounded-r-full opacity-75" />
                  </>
                )}
                
                {/* Icon */}
                <div className={`
                  flex-shrink-0
                  ${active ? 'text-white' : 'text-gray-400 group-hover:text-blue-400'}
                  transition-all duration-300
                  ${active ? 'scale-110' : 'group-hover:scale-110'}
                `}>
                  {item.icon}
                </div>
                
                {/* Title */}
                <span className="flex-1 font-medium">{item.title}</span>
                
                {/* Badge */}
                {item.badge && (
                  <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
                
                {/* Hover effect */}
                <div className={`
                  absolute inset-0 rounded-lg
                  bg-gradient-to-r from-blue-600/0 to-blue-500/0
                  group-hover:from-blue-600/10 group-hover:to-blue-500/10
                  transition-opacity duration-200
                  ${active ? 'opacity-0' : 'opacity-100'}
                `} />
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-700">
          <div className="mb-3 px-4 py-2 rounded-lg bg-gray-800/50">
            <p className="text-xs text-gray-400 mb-1">
              {isSystemAdmin ? 'Admin geral' : 'Agência'}
            </p>
            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-500/20 transition-all duration-300 group border border-transparent hover:border-red-500/30"
          >
            <svg className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-all duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
