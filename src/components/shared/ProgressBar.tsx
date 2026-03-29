interface Props {
  value: number; // 0-100
}

export function ProgressBar({ value }: Props) {
  return (
    <div className="w-full h-[3px] bg-border">
      <div
        className="h-full bg-accent transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
