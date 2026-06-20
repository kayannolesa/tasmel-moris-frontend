import {
  Building2,
  ChevronLeft,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Landmark,
  ListChecks,
  Settings2,
  UserCircle,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/", label: "Command", icon: LayoutDashboard, end: true },
  { to: "/admin", label: "Administration", icon: Settings2 },
  { to: "/registry", label: "Registry", icon: UsersRound },
  { to: "/configuration", label: "Configuration", icon: Landmark },
  { to: "/obligations", label: "Obligations", icon: ListChecks },
  { to: "/filing", label: "Filing", icon: FileCheck2 },
  { to: "/account", label: "Account", icon: UserCircle },
];

export default function WorkspaceLayout() {
  const auth = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const primaryRole = useMemo(() => auth.actor?.roles?.[0]?.role_name || "MORIS staff", [auth.actor]);

  return (
    <div className={`workspace ${sidebarCollapsed ? "workspace--collapsed" : ""}`}>
      <aside className={`workspace-sidebar ${sidebarOpen ? "workspace-sidebar--open" : ""}`}>
        <div className="workspace-brand">
          <div className="workspace-brand__seal">
            <Building2 size={22} strokeWidth={2.1} />
          </div>
          <div className="workspace-brand__text">
            <strong>MORIS</strong>
            <span>Ministry of Revenue</span>
          </div>
          <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="workspace-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className="workspace-nav__item">
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="workspace-sidebar__footer">
          <button className="sidebar-collapse" type="button" onClick={() => setSidebarCollapsed((value) => !value)}>
            <ChevronLeft size={17} />
            <span>Collapse</span>
          </button>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="workspace-topbar">
          <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="workspace-topbar__title">
            <span>Integrated Revenue Platform</span>
            <strong>Staff Workspace</strong>
          </div>
          <div className="workspace-user">
            <div>
              <strong>{auth.actor?.display_name_txt}</strong>
              <span>{primaryRole}</span>
            </div>
            <button className="icon-button" type="button" onClick={auth.logout} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
