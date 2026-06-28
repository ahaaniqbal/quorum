export default function Splash() {
  return (
    <div className="dot-grid flex h-screen items-center justify-center bg-bg">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center border border-border bg-surface/40">
          <img
            src="/quorum-loader.svg"
            alt=""
            aria-hidden="true"
            className="h-[18px] w-[18px] animate-spin opacity-95"
          />
        </div>
        <span className="mono-label normal-case tracking-normal text-secondary">
          waking the account brain…
        </span>
      </div>
    </div>
  );
}
