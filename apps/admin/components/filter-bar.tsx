"use client";

import { FilterBar as SharedFilterBar } from "@unforgit/ui/components";

interface FilterBarProps {
  type: string;
  status: string;
  onTypeChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}

export function FilterBar({
  type,
  status,
  onTypeChange,
  onStatusChange,
}: FilterBarProps) {
  return (
    <SharedFilterBar
      type={type}
      status={status}
      onTypeChange={onTypeChange}
      onStatusChange={onStatusChange}
      showSourceFilter={false}
    />
  );
}
