'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Focus management for dialogs, sheets and side panels.
 *
 *   useFocusTrap(ref, active, { restoreTo, trap, initialFocus })
 *
 * While `active`:
 *   - moves focus into `ref` on open — to `initialFocus` when given,
 *     otherwise the first focusable descendant, otherwise the container
 *     itself (which gets tabindex=-1 so it can hold focus);
 *   - when `trap` is true (default) keeps Tab / Shift+Tab cycling inside
 *     the container;
 *   - on close restores focus to `restoreTo` (element or ref) or, failing
 *     that, to whatever was focused when the panel opened.
 *
 * Non-modal panels (the conflict / empire sidebars) pass `trap: false` —
 * focus moves to their close button on open and comes back on close, but
 * Tab is free to leave for the map and timeline.
 */
export interface FocusTrapOptions {
  /** Where to send focus when the panel closes. Defaults to the element
   *  that had focus when it opened. */
  restoreTo?: HTMLElement | RefObject<HTMLElement | null> | null;
  /** Keep Tab inside the container. Default true. */
  trap?: boolean;
  /** Element to focus on open instead of the first focusable. */
  initialFocus?: RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.hasAttribute('aria-hidden') &&
      !el.closest('[aria-hidden="true"]') &&
      (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0),
  );
}

function resolve(
  target: HTMLElement | RefObject<HTMLElement | null> | null | undefined,
): HTMLElement | null {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  return target.current ?? null;
}

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  options: FocusTrapOptions = {},
): void {
  const { restoreTo, trap = true, initialFocus } = options;

  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');

    // Move focus in. Deferred one frame so the sheet's enter animation has
    // laid out and `preventScroll` doesn't fight the scroll container.
    const raf = requestAnimationFrame(() => {
      const target = resolve(initialFocus) ?? getFocusable(root)[0] ?? root;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (!trap || e.key !== 'Tab') return;
      const items = getFocusable(root);
      if (items.length === 0) {
        e.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      const inside = current ? root.contains(current) : false;
      if (e.shiftKey) {
        if (!inside || current === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      const back = resolve(restoreTo) ?? previouslyFocused;
      if (back && document.contains(back) && back !== document.body) {
        back.focus({ preventScroll: true });
      }
    };
    // `restoreTo`/`initialFocus` are refs or stable elements; re-running on
    // their identity would re-move focus mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, active, trap]);
}
