export function ProgressMeter({
  value,
  total,
  label = "Checks completed",
}: {
  value: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="meter">
      <div>
        <strong>
          {value.toLocaleString()} / {total.toLocaleString()}
        </strong>
        <span>{label}</span>
      </div>
      <progress value={value} max={total || 1} aria-label={label} />
    </div>
  );
}
