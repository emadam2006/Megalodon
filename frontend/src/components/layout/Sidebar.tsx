import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Network,
  Radio,
  History,
  BarChart3,
  ShieldCheck,
  Scale,
  AlertTriangle,
  Server,
  HeartPulse,
  Users,
  Key,
  FileText,
  Sliders,
  LineChart,
  MapPin,
  Cpu,
  Layers,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth, UserRole } from "../../context/AuthContext";

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  /** Roles that can see this item. Undefined = all authenticated users */
  roles?: UserRole[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
  /** If set, only users with at least one of these roles see the whole group */
  roles?: UserRole[];
}

export const Sidebar: React.FC = () => {
  const { hasAnyRole } = useAuth();

  // Sidebar collapsed / expanded state (persisted)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return (localStorage.getItem("megalodon_sidebar_collapsed") ?? localStorage.getItem("sentinel_sidebar_collapsed")) === "true";
  });

  // Floating popup state for collapsed mode
  const [hoveredItem, setHoveredItem] = useState<{
    name: string;
    category: string;
    top: number;
  } | null>(null);

  // Accordion state for each category group (persisted)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("megalodon_sidebar_groups") || localStorage.getItem("sentinel_sidebar_groups");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      "Overview": true,
      "Network Visibility": true,
      "Traffic Management": true,
      "Security & Firewall": true,
      "Infrastructure": true,
      "Access Control": true,
      "System": true,
    };
  });

  const toggleSidebar = () => {
    setHoveredItem(null);
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("megalodon_sidebar_collapsed", String(next));
      return next;
    });
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      localStorage.setItem("megalodon_sidebar_groups", JSON.stringify(next));
      return next;
    });
  };

  const navGroups: NavGroup[] = [
    {
      title: "Overview",
      items: [
        { name: "Dashboard", to: "/", icon: LayoutDashboard },
      ],
    },
    {
      title: "Network Visibility",
      items: [
        { name: "Interfaces", to: "/network/interfaces", icon: Network },
        { name: "Listening Ports", to: "/network/ports", icon: Cpu },
        { name: "Connections", to: "/network/connections", icon: Radio },
        { name: "Topology Map", to: "/network/map", icon: MapPin },
      ],
    },
    {
      title: "Traffic Management",
      items: [
        { name: "Live Stream", to: "/traffic/live", icon: Radio },
        { name: "Request History", to: "/traffic/history", icon: History },
        { name: "Analytics", to: "/traffic/analytics", icon: BarChart3 },
      ],
    },
    {
      title: "Security & Firewall",
      items: [
        { name: "IP Policies", to: "/security/ip-policies", icon: ShieldCheck },
        { name: "Rule Engine", to: "/security/rules", icon: Scale },
        { name: "Security Events", to: "/security/events", icon: Layers },
        { name: "Alerts", to: "/security/alerts", icon: AlertTriangle },
      ],
    },
    {
      title: "Infrastructure",
      items: [
        { name: "Backends & Routes", to: "/infrastructure/backends", icon: Server },
        { name: "System Health", to: "/infrastructure/health", icon: HeartPulse },
      ],
    },
    {
      title: "Access Control",
      items: [
        { name: "Users & Roles", to: "/access/users", icon: Users, roles: ["ADMIN"] },
        { name: "API Keys", to: "/access/api-keys", icon: Key, roles: ["ADMIN", "OPERATOR"] },
        { name: "Audit Logs", to: "/access/audit-logs", icon: FileText, roles: ["ADMIN"] },
      ],
    },
    {
      title: "System",
      items: [
        { name: "Observability", to: "/system/observability", icon: LineChart, roles: ["ADMIN", "OPERATOR"] },
        { name: "Settings", to: "/system/settings", icon: Sliders, roles: ["ADMIN"] },
      ],
    },
  ];

  return (
    <aside
      onScroll={() => setHoveredItem(null)}
      className={`${
        isCollapsed ? "w-16" : "w-60"
      } flex-shrink-0 h-full border-r border-zinc-200 dark:border-neutral-800 bg-white dark:bg-black p-2.5 flex flex-col justify-between overflow-y-auto select-none transition-all duration-200 ease-in-out`}
    >
      <div className="space-y-3">
        {/* Sidebar Header / Open & Close toggle */}
        <div
          className={`flex items-center pb-2 border-b border-zinc-200 dark:border-neutral-800 ${
            isCollapsed ? "justify-center" : "justify-between px-1"
          }`}
        >
          {!isCollapsed && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-neutral-500 font-semibold">
              Navigation
            </span>
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-zinc-500 dark:text-neutral-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-900 transition-colors"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="space-y-4">
          {navGroups.map((group, idx) => {
            // Filter items the current user has permission to see
            const visibleItems = group.items.filter(
              (item) => !item.roles || hasAnyRole(item.roles)
            );

            // Hide entire group if no visible items
            if (visibleItems.length === 0) return null;

            const isGroupOpen = openGroups[group.title] !== false;

            // ── COLLAPSED MODE (Only show icons of every tab) ──
            if (isCollapsed) {
              return (
                <div key={idx} className="space-y-1">
                  {idx > 0 && (
                    <div className="w-6 h-[1px] mx-auto bg-zinc-200 dark:bg-neutral-800 my-1.5" />
                  )}
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        aria-label={item.name}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredItem({
                            name: item.name,
                            category: group.title,
                            top: rect.top + rect.height / 2,
                          });
                        }}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => setHoveredItem(null)}
                        className={({ isActive }) =>
                          `flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all ${
                            isActive
                              ? "bg-zinc-900 text-white font-medium shadow-sm dark:bg-white dark:text-black"
                              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900"
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      </NavLink>
                    );
                  })}
                </div>
              );
            }

            // ── EXPANDED MODE (Accordion groups with open/close) ──
            return (
              <div key={idx} className="space-y-1">
                {/* Accordion Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded-md text-[10px] font-semibold tracking-wider text-zinc-500 dark:text-neutral-500 uppercase hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-neutral-900/50 transition-colors"
                >
                  <span>{group.title}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-zinc-400 dark:text-neutral-500 transition-transform duration-200 ${
                      isGroupOpen ? "transform rotate-0" : "transform -rotate-90"
                    }`}
                  />
                </button>

                {/* Accordion Items List with smooth height & opacity animation */}
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
                    isGroupOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0 pointer-events-none"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5 pt-0.5">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                                isActive
                                  ? "bg-zinc-900 text-white font-medium shadow-sm dark:bg-white dark:text-black"
                                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900"
                              }`
                            }
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div
        className={`pt-2.5 border-t border-zinc-200 dark:border-neutral-900 ${
          isCollapsed ? "flex justify-center" : "px-2"
        }`}
      >
        {isCollapsed ? (
          <div
            className="flex items-center justify-center p-1.5 cursor-default"
            title="Megalodon Host Agent: Online"
            aria-label="Megalodon Host Agent: Online"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-neutral-500 font-mono">
            <span>Agent: Online</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          </div>
        )}
      </div>

      {/* Floating Popup Tooltip when sidebar is collapsed */}
      {isCollapsed && hoveredItem && (
        <div
          style={{ top: `${hoveredItem.top}px` }}
          className="fixed left-[72px] -translate-y-1/2 z-[9999] pointer-events-none flex items-center drop-shadow-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Subtle Caret pointing to icon */}
          <div className="w-2 h-2 rotate-45 bg-zinc-900 dark:bg-white -mr-1 z-10" />

          {/* Popup Card */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black border border-zinc-800 dark:border-neutral-200 shadow-2xl">
            <span className="text-xs font-semibold whitespace-nowrap tracking-tight">
              {hoveredItem.name}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-neutral-500 pl-1.5 border-l border-zinc-700 dark:border-neutral-300">
              {hoveredItem.category}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
