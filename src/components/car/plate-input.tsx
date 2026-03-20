"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PlateInput({ value, onChange, className }: PlateInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-uppercase and strip invalid characters (only allow A-Z, 0-9, hyphens)
    const cleaned = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "");
    onChange(cleaned);
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder="ABC-123-D"
      maxLength={12}
      className={cn("font-mono tracking-wider uppercase", className)}
    />
  );
}
