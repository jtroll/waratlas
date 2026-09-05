/**
 * "Skip to timeline" link — must be the FIRST focusable element on the map
 * page (mount it as the first child of <main> in app/page.tsx). Visually
 * hidden until it receives keyboard focus (see .skip-link in globals.css).
 *
 * The target needs `id="timeline"` and `tabIndex={-1}` so the jump lands
 * focus on the timeline region rather than merely scrolling.
 */
export default function SkipLink({
  href = '#timeline',
  children = 'Skip to timeline',
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a href={href} className="skip-link">
      {children}
    </a>
  );
}
