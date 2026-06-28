export default function Splash() {
  return (
    <div className="dot-grid flex h-screen items-center justify-center bg-bg">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded border border-border">
          <div
            className="h-3 w-3 animate-pulse rounded-full border-[1.5px]"
            style={{ borderColor: "var(--accent)" }}
          />
        </div>
        <span className="mono-label normal-case tracking-normal text-secondary">
          waking the account brain…
        </span>
      </div>
    </div>
  );
}
