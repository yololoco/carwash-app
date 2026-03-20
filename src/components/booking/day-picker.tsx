"use client";

import { cn } from "@/lib/utils";

const DAYS = [
  { value: "monday", label: "L" },
  { value: "tuesday", label: "M" },
  { value: "wednesday", label: "M" },
  { value: "thursday", label: "J" },
  { value: "friday", label: "V" },
  { value: "saturday", label: "S" },
  { value: "sunday", label: "D" },
] as const;

interface DayPickerProps {
  selectedDays: string[];
  onChange: (days: string[]) => void;
}

export function DayPicker({ selectedDays, onChange }: DayPickerProps) {
  const toggle = (day: string) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  return (
    <div className="flex gap-2">
      {DAYS.map((day) => {
        const selected = selectedDays.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => toggle(day.value)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
