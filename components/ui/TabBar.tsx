"use client";

export function TabBar({
  items,
  active,
  onChange,
  ariaLabel,
}: {
  items: readonly { value: string; label: string }[];
  active: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="tabs" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className="tab"
          aria-pressed={item.value === active}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
