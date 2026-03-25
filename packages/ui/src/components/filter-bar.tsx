"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select";

export interface FilterBarProps {
  source?: string;
  type: string;
  status: string;
  onSourceChange?: (v: string) => void;
  onTypeChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  showSourceFilter?: boolean;
}

export function FilterBar({
  source,
  type,
  status,
  onSourceChange,
  onTypeChange,
  onStatusChange,
  showSourceFilter = true,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showSourceFilter && source !== undefined && onSourceChange && (
        <Select value={source} onValueChange={onSourceChange}>
          <SelectTrigger className="w-[120px] h-8 text-[12px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="remote">Remote</SelectItem>
          </SelectContent>
        </Select>
      )}

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
          <SelectItem value="deleted">Deleted</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
