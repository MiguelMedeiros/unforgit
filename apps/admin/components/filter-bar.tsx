"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center gap-2">
      <Select value={type} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[130px] h-8 text-[12px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="episodic">Episodic</SelectItem>
          <SelectItem value="semantic">Semantic</SelectItem>
          <SelectItem value="procedural">Procedural</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[130px] h-8 text-[12px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="deprecated">Deprecated</SelectItem>
          <SelectItem value="superseded">Superseded</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
