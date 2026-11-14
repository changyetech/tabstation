import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentPropsWithRef } from 'react';
import { createPortal } from 'react-dom';
import './TooltipButton.css';

type Props = ComponentPropsWithRef<'button'> & { title: string };
const HOVER_DELAY_MS = 150;
const MARGIN = 8;

// 操作提示独立于浏览器原生 title 延迟；portal 避免被卡片裁剪。
export default function TooltipButton({ title, ref, ...props }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [visibility, setVisibility] = useState<'hidden' | 'pending' | 'visible'>('hidden');
  const open = visibility === 'visible';
  const id = useId();
  useImperativeHandle(ref, () => buttonRef.current!);

  const cancelPending = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  const close = () => {
    cancelPending();
    setVisibility('hidden');
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (visibility === 'hidden') return;
    const dismiss = () => {
      clearTimeout(timer.current);
      timer.current = undefined;
      setVisibility('hidden');
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('blur', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('blur', dismiss);
    };
  }, [visibility]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !tooltipRef.current) return;
    const anchor = buttonRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const { width, height } = tooltip.getBoundingClientRect();
    const left = Math.max(
      MARGIN,
      Math.min(anchor.left + (anchor.width - width) / 2, window.innerWidth - width - MARGIN),
    );
    const below = anchor.bottom + MARGIN;
    const top =
      below + height <= window.innerHeight - MARGIN
        ? below
        : Math.max(MARGIN, anchor.top - height - MARGIN);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }, [open, title]);

  return (
    <>
      <button
        {...props}
        ref={buttonRef}
        title=""
        aria-label={props['aria-label'] ?? title}
        aria-describedby={
          [props['aria-describedby'], open ? id : undefined].filter(Boolean).join(' ') || undefined
        }
        onPointerEnter={(event) => {
          props.onPointerEnter?.(event);
          if (event.pointerType === 'touch') return;
          cancelPending();
          setVisibility('pending');
          timer.current = setTimeout(() => {
            timer.current = undefined;
            setVisibility('visible');
          }, HOVER_DELAY_MS);
        }}
        onPointerLeave={(event) => {
          close();
          props.onPointerLeave?.(event);
        }}
        onFocus={(event) => {
          cancelPending();
          setVisibility('visible');
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          close();
          props.onBlur?.(event);
        }}
        onPointerDown={(event) => {
          close();
          props.onPointerDown?.(event);
        }}
        onClick={(event) => {
          close();
          props.onClick?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
          props.onKeyDown?.(event);
        }}
      />
      {open &&
        createPortal(
          <span ref={tooltipRef} id={id} role="tooltip" className="action-tooltip">
            {title}
          </span>,
          document.body,
        )}
    </>
  );
}
