// Server Component — no interactivity needed here.
// NavLink handles its own active state via usePathname.
// SignOutButton is extracted as a Client Component for the onClick handler.

import { NavLink } from "./NavLink";
import { SignOutButton } from "./SignOutButton";

// Inline SVG icons — no icon library dependency
function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function DocumentsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { href: "/documents", label: "Documents", icon: <DocumentsIcon /> },
  { href: "/chat", label: "Chat", icon: <ChatIcon /> },
];

interface SidebarProps {
  email: string;
}

export function Sidebar({ email }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card" role="navigation" aria-label="Main navigation">
      {/* App name / logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <span className="text-lg font-semibold text-foreground">AI Product</span>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} icon={item.icon}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-3 space-y-1">
        <div className="px-3 py-2">
          {/* truncate prevents long emails from breaking the layout */}
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium text-foreground truncate">{email}</p>
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}
