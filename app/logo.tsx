/** Oceana brand mark — three OCEAN trait bars on a navy tile. */
export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#16334e" />
        <rect x="5.2" y="6" width="3.9" height="11.5" rx="1.95" fill="#ff7f63" />
        <rect x="10.2" y="8" width="3.9" height="9.5" rx="1.95" fill="#2c4c6e" />
        <rect x="15.2" y="10" width="3.9" height="7.5" rx="1.95" fill="#a5cbea" />
      </svg>
      <span className="text-[15px] font-extrabold tracking-tight">OCEANA</span>
    </span>
  );
}
