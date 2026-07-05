import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="h-10 w-10 text-slate-400" />
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Basecamp PM needs a connection to load your projects. Check your network and try again.
      </p>
      <Link
        href="/"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
      >
        Retry
      </Link>
    </div>
  );
}
