// A frosted, blurred page loader for transitions where a full skeleton would be
// noisy. Sits over the content area with a subtle backdrop blur.
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="animate-fade-in grid min-h-[60vh] place-items-center bg-white/30 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
    </div>
  );
}
