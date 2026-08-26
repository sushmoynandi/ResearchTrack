"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  UserCog,
  Milestone,
  Calendar,
  Building,
  X,
  User,
  Share2,
  HelpCircle,
  MonitorPlay,
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { useAuth } from "@/components/auth/AuthProvider";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentScope = searchParams?.get("scope");
  const prevPathname = useRef(pathname);
  const { isCollapsed, toggleCollapsed, isMobileOpen, closeMobile } =
    useSidebar();
  const { user, isSupervisor, isAdmin } = useAuth();

  // Close mobile drawer only when pathname genuinely changes
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      closeMobile();
    }
  }, [pathname, closeMobile]);

  const navItems = isAdmin
    ? [
        { href: "/admin/users", label: "User Management", icon: ShieldCheck },
        { href: "/admin/role-requests", label: "Role Requests", icon: UserCog },
        { href: "/admin/audit", label: "Audit Trail", icon: ShieldAlert },
        {
          href: "/admin/help-videos",
          label: "How to Use Videos",
          icon: MonitorPlay,
        },
      ]
    : [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/labs', label: 'Research Labs', icon: Building },
        { href: '/papers', label: 'Paper Library', icon: FileText },
        ...(user?.systemRole === 'STUDENT'
          ? [{ href: '/papers?scope=shared', label: 'Shared Papers', icon: Share2 }]
          : []),
        { href: "/tracks", label: "Reading Tracks", icon: Milestone },
        { href: "/collections", label: "Collections", icon: FolderOpen },
        { href: "/tags", label: "Tags", icon: Tags },
        { href: "/assignments", label: "Assignments", icon: ClipboardList },
        { href: "/meetings", label: "1-on-1 Meetings", icon: Calendar },
        { href: "/milestones", label: "Thesis Milestones", icon: Milestone },
        ...(isSupervisor
          ? [{ href: "/students", label: "My Students", icon: Users }]
          : []),
        { href: "/help", label: "How to Use (Help)", icon: HelpCircle },
      ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/papers?scope=shared') return pathname === '/papers' && currentScope === 'shared'
    if (href === '/papers') return pathname === '/papers' && currentScope !== 'shared'
    return pathname.startsWith(href)
  }

  // Quick 4 items for mobile bottom bar
  const mobileQuickItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/papers', label: 'Library', icon: FileText },
    { href: '/tracks', label: 'Tracks', icon: Milestone },
    { href: '/labs', label: 'Labs', icon: Building },
  ]

  return (
    <>
      {/* ─── 1. Desktop Sidebar ───────────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40
          bg-bg-secondary border-r border-border-default
          transition-all duration-300 ease-smooth
          hidden md:flex flex-col
          ${isCollapsed ? "w-[72px]" : "w-[260px]"}
        `}
      >
        {/* Branding */}
        <div
          className={`flex items-center h-16 border-b border-border-default shrink-0 ${
            isCollapsed ? "justify-center px-2" : "px-5"
          }`}
        >
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
            const Icon = item.icon;
            const active = isActive(item.href);
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
                      ? "bg-accent-subtle text-accent font-semibold"
                      : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                  }
                  ${isCollapsed ? "justify-center" : ""}
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
            );
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
              ${isCollapsed ? "justify-center" : ""}
            `}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
            {!isCollapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ─── 2. Mobile Slide-Out Drawer (Full Navigation) ──────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop blur overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
            onClick={closeMobile}
          />

          {/* Slide-out Drawer Panel */}
          <div className="relative w-[280px] max-w-[85vw] bg-bg-secondary border-r border-border-default h-full shadow-2xl flex flex-col z-10">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-5 border-b border-border-default shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-accent" />
                </div>
                <span className="text-base font-bold text-text-primary font-display">
                  ResearchTrack
                </span>
              </div>
              <button
                type="button"
                onClick={closeMobile}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary cursor-pointer"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav list */}
            <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl
                      transition-all duration-200 text-sm font-medium
                      ${
                        active
                          ? "bg-accent text-white font-bold shadow-sm"
                          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Profile Footer */}
            {user && (
              <div className="p-4 border-t border-border-default bg-bg-primary/50 shrink-0 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text-primary truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-text-tertiary truncate">
                    {user.systemRole} • {user.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. Mobile Floating Bottom Quick Bar ───────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-bg-secondary/95 backdrop-blur-lg border-t border-border-default">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileQuickItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center flex-1 py-1 rounded-lg
                  transition-all duration-200
                  ${
                    active
                      ? "text-accent font-bold"
                      : "text-text-tertiary hover:text-text-secondary"
                  }
                `}
              >
                <Icon size={20} className={active ? "scale-110" : ""} />
                <span className="text-[10px] font-medium mt-1">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
