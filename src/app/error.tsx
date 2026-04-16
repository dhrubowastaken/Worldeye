'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">
          Runtime Recovery
        </p>
        <h1 className="mt-3 text-3xl font-semibold">The surface hit an unexpected fault</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {error.message || 'An unexpected rendering or provider error occurred.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full border border-cyan-300/40 bg-cyan-200/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 transition hover:bg-cyan-200/20"
        >
          Retry Experience
        </button>
      </div>
    </div>
  );
}
