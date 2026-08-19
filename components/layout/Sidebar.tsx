'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tags,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  ClipboardList,
  ShieldCheck,
  ShieldAlert,
  Milestone,
  Calendar,
  Building,
} from 'lucide-react'
import { useSidebar } from './SidebarContext'
import { useAuth } from '@/components/auth/AuthProvider'

export function Sidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleCollapsed } = useSidebar()
  const { user, isSupervisor, isAdmin } = useAuth()

  const navItems = isAdmin
    ? [
        { href: '/admin/users', label: 'User Management', icon: ShieldCheck },
        { href: '/admin/audit', label: 'Audit Trail', icon: ShieldAlert },
      ]
    : [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/labs', label: 'Research Labs', icon: Building },
        { href: '/papers', label: 'Paper Library', icon: FileText },
        { href: '/collections', label: 'Collections', icon: FolderOpen },
        { href: '/tracks', label: 'Reading Tracks', icon: Milestone },
        { href: '/tags', label: 'Tags', icon: Tags },
        { href: '/assignments', label: 'Assignments', icon: ClipboardList },
        { href: '/meetings', label: '1-on-1 Meetings', icon: Calendar },
        { href: '/milestones', label: 'Milestones', icon: Milestone },
        ...(isSupervisor
          ? [{ href: '/students', label: 'My Students', icon: Users }]
          : []),
      ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          bg-bg-secondary border-r border-border-default
          transition-all duration-300 ease-smooth
          hidden md:flex flex-col
          ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
        `}
      >
        {/* Branding */}
        <div className={`flex items-center h-16 border-b border-border-default shrink-0 ${isCollapsed ? 'justify-center px-2' : 'px-5'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-accent" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-semibold text-text-primary font-display tracking-tight">
                ResearchTrack
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 ease-smooth
                  group relative
                  ${
                    active
                      ? 'bg-accent-subtle text-accent font-semibold'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon size={19} className="shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
                {/* Active indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-border-default">
          <button
            onClick={toggleCollapsed}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary
              transition-all duration-200 ease-smooth cursor-pointer
              ${isCollapsed ? 'justify-center' : ''}
            `}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-bg-secondary border-t border-border-default">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg
                  transition-all duration-200
                  ${
                    active
                      ? 'text-accent'
                      : 'text-text-tertiary'
                  }
                `}
              >
                <Icon size={19} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
