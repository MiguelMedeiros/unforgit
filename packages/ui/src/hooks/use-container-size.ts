"use client";

import { useState, useRef, useCallback } from "react";

export function useContainerSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const elRef = useRef<HTMLDivElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const callbackRef = useCallback((node: HTMLDivElement | null) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }

    elRef.current = node;
    if (!node) return;

    const measure = () => {
      const w = node.clientWidth;
      const h = node.clientHeight;
      setSize((prev) => {
        if (prev.width === w && prev.height === h) return prev;
        return { width: w, height: h };
      });
    };

    measure();

    roRef.current = new ResizeObserver(measure);
    roRef.current.observe(node);
  }, []);

  return { size, callbackRef, elRef };
}
