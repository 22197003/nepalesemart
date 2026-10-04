const COLOURS = ["#1f5fae", "#ffffff", "#c8102e", "#2e8b57", "#f2c230"]; // blue, white, red, green, yellow

/** A sagging string of prayer flags (lungta). Purely decorative. */
export function PrayerFlags({ className }: { className?: string }) {
  const N = 26;
  const y = (t: number) => (1 - t) ** 2 * 8 + 2 * (1 - t) * t * 78 + t ** 2 * 8;
  return (
    <svg
      viewBox="0 0 1200 110"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className}
    >
      <g className="flags-sway">
        <path
          d={`M0 8 Q600 148 1200 8`}
          fill="none"
          stroke="#14213d"
          strokeOpacity=".55"
          strokeWidth="1.5"
        />
        {Array.from({ length: N }, (_, i) => {
          const t = (i + 0.5) / N;
          const x = t * 1200;
          const slope =
            (((2 * (1 - t) * (78 - 8) + 2 * t * (8 - 78)) / 1200) * 1200) /
            1200; // gentle tilt
          return (
            <rect
              key={i}
              x={x - 13}
              y={y(t) + 1}
              width="26"
              height="32"
              rx="1.5"
              fill={COLOURS[i % 5]}
              stroke="#14213d"
              strokeOpacity=".15"
              transform={`rotate(${slope * 6} ${x} ${y(t)})`}
            />
          );
        })}
      </g>
    </svg>
  );
}
