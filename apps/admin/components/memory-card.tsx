"use client";

import { MemoryCard as SharedMemoryCard } from "@unforgit/ui/components";

interface MemoryCardProps {
  id: string;
  memoryType: string;
  text: string;
  tags: string[];
  status: string;
  createdAt: string;
  onClick?: () => void;
}

export function MemoryCard({
  id,
  memoryType,
  text,
  tags,
  status,
  createdAt,
  onClick,
}: MemoryCardProps) {
  return (
    <SharedMemoryCard
      id={id}
      memoryType={memoryType}
      text={text}
      tags={tags}
      status={status}
      source="remote"
      createdAt={createdAt}
      onClick={onClick}
    />
  );
}
