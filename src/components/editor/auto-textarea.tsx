"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** A textarea that grows with its content and exposes its element via ref. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutoTextarea({ value, ...props }, forwardedRef) {
    const inner = useRef<HTMLTextAreaElement | null>(null);

    const resize = useCallback(() => {
      const el = inner.current;
      if (!el) return;
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    useLayoutEffect(resize, [value, resize]);
    useLayoutEffect(() => {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, [resize]);

    return (
      <textarea
        {...props}
        value={value}
        rows={1}
        ref={(el) => {
          inner.current = el;
          if (typeof forwardedRef === "function") forwardedRef(el);
          else if (forwardedRef) forwardedRef.current = el;
        }}
      />
    );
  }
);
