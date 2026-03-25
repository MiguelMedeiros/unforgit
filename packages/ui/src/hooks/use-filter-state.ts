"use client";

import { useState, useCallback } from "react";

export function useFilterState<T extends string>(
  initialValues: T[],
  options?: { minSelected?: number }
) {
  const minSelected = options?.minSelected ?? 0;
  const [values, setValues] = useState<Set<T>>(new Set(initialValues));

  const toggle = useCallback(
    (value: T) => {
      setValues((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          if (next.size > minSelected) {
            next.delete(value);
          }
        } else {
          next.add(value);
        }
        return next;
      });
    },
    [minSelected]
  );

  const has = useCallback((value: T) => values.has(value), [values]);

  const reset = useCallback(() => {
    setValues(new Set(initialValues));
  }, [initialValues]);

  return { values, toggle, has, reset, setValues };
}
