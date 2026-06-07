import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ember-black">
      <h1 className="font-cormorant text-8xl font-light text-parchment/20">404</h1>
      <h2 className="text-xl font-semibold text-parchment/70">Page not found</h2>
      <p className="text-sm text-ash-gray">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-ember px-6 py-2 text-sm font-medium text-parchment hover:shadow-[0_0_20px_rgba(212,87,42,0.35)] transition-all duration-200"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
