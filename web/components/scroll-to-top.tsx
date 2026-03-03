"use client";

import { useEffect, useState, RefObject } from "react";
import { ArrowUp } from "lucide-react";

interface ScrollToTopProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  threshold?: number;
}

export function ScrollToTop({
  scrollContainerRef,
  threshold = 300,
}: ScrollToTopProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      setShow(scrollContainer.scrollTop > threshold);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef, threshold]);

  function scrollToTop() {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!show) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-dracula-purple text-dracula-background shadow-lg transition-all hover:bg-dracula-purple/90 hover:scale-105 active:scale-95"
      title="Scroll to top"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
