interface SparklinePoint {
  date: string;
  value: number;
}

export default function Sparkline({
  points,
  formatDate,
  formatValue = (v) => String(v),
}: {
  points: SparklinePoint[];
  formatDate: (iso: string) => string;
  formatValue?: (v: number) => string;
}) {
  const width = 320;
  const height = 100;
  const padX = 12;
  const padY = 14;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((v, i) => {
    const x =
      values.length === 1 ? width / 2 : padX + (i / (values.length - 1)) * (width - padX * 2);
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return [x, y] as const;
  });

  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <path d={path} fill="none" stroke="#4f9dff" strokeWidth={2} />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} fill="#3ddc97" />
        ))}
      </svg>
      <div className="sparkline-labels">
        <span>
          {formatDate(points[0].date)} · {formatValue(points[0].value)}
        </span>
        <span className="muted">peak {formatValue(max)}</span>
        <span>
          {formatDate(points[points.length - 1].date)} · {formatValue(points[points.length - 1].value)}
        </span>
      </div>
    </div>
  );
}
