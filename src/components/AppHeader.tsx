import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";

interface AppHeaderProps {
  email: string;
  onMenuClick?: () => void;
}

export default function AppHeader({ email, onMenuClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800/90 backdrop-blur light-mode:bg-white/90 light-mode:border-slate-200">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden mr-3 p-2 text-slate-400 hover:text-white"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="font-semibold text-white light-mode:text-slate-900">BevisDrive</div>
        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-slate-400 sm:block">{email}</div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
