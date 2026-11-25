"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ChartNoAxesCombined, ClipboardList, Database, FlaskConical, HeartPulse, House, Info, Menu, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHealth } from "@/hooks/use-backend";

const routes = [
  { path: "/", label: "Dashboard", icon: House },
  { path: "/assessment", label: "Patient Assessment", icon: ClipboardList },
  { path: "/results", label: "Prediction Results", icon: Activity },
  { path: "/analytics", label: "Model Analytics", icon: ChartNoAxesCombined },
  { path: "/dataset", label: "Dataset Overview", icon: Database },
  { path: "/about", label: "About the System", icon: Info },
];

function BackendStatus() {
  const { state, refresh } = useHealth();
  const status = state.status === "ready" ? state.data.status : state.status;
  const label = {
    ok: "Model ready",
    degraded: "Model unavailable",
    loading: "Checking backend",
    error: state.status === "error" && state.kind === "response" ? "Backend response invalid" : "Backend unreachable",
  }[status];

  return (
    <div className="connection">
      <div className="connection-state" role="status">
        {state.status === "ready" && <span className="connection-caption">Backend connected</span>}
        <span className={`connection-label ${status}`}>
          <span className="status-dot" aria-hidden="true" />
          {label}
        </span>
      </div>
      <button className="icon-button refresh" type="button" onClick={refresh} aria-label="Check backend connection" title="Check backend connection" disabled={status === "loading"}>
        <RefreshCw size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const open = openPath === pathname;
  const current = routes.find((route) => route.path === pathname);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPath(null);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className={`sidebar ${open ? "is-open" : ""}`} id="workspace-navigation">
        <Link href="/" className="brand" onClick={() => setOpenPath(null)}>
          <span className="brand-symbol"><HeartPulse size={23} aria-hidden="true" /></span>
          <span>Readmission<span className="brand-second">Prediction System</span></span>
        </Link>
        <nav className="navigation" aria-label="Workspace">
          <p className="nav-heading">Workspace</p>
          {routes.map(({ path, label, icon: Icon }) => (
            <Link key={path} href={path} className="nav-link" aria-current={path === pathname ? "page" : undefined} onClick={() => setOpenPath(null)}>
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <FlaskConical size={19} aria-hidden="true" />
          <div><strong>Academic prototype</strong><p>For research and demonstration.</p></div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <button ref={menuButton} className="icon-button mobile-toggle" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setOpenPath(open ? null : pathname)}>
              {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
            </button>
            <span>{current?.label ?? "Readmission Prediction"}</span>
          </div>
          <BackendStatus />
        </header>
        <main className="main-content" id="main" tabIndex={-1}>
          {children}
          {pathname !== "/" && <footer className="workspace-footer"><Info size={16} aria-hidden="true" /> Academic prototype. Do not use model outputs for clinical decisions.</footer>}
        </main>
      </div>
    </div>
  );
}
