import LogoutButton from "./LogoutButton";

export default function AppHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700 bg-slate-800/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="font-semibold text-white">BevisDrive</div>
        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-slate-400 sm:block">{email}</div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
