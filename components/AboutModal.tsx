'use client';

import { useEffect } from 'react';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * About / Methodology modal. Linked from the "?" button in the TopBar.
 * Designed to satisfy researcher / journalist scrutiny of the data.
 */
export default function AboutModal({ open, onClose }: AboutModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-wars-panel border border-wars-border rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-wars-panel/95 backdrop-blur-sm border-b border-wars-border px-6 py-4 flex items-start justify-between">
          <div>
            <h2 id="about-title" className="text-xl font-bold text-wars-text">About Wars Atlas</h2>
            <p className="text-xs text-wars-muted mt-0.5">
              An interactive history of armed conflict
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-wars-border/50 flex items-center justify-center hover:bg-wars-border transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6 text-sm text-wars-text/90 leading-relaxed">
          {/* Intro */}
          <Section heading="What this is">
            <p>
              An interactive map of every armed conflict in recorded human history, layered over
              evolving empire borders. Scrub the timeline to watch the political map change while
              wars appear and resolve.
            </p>
            <p className="mt-2">
              The dataset currently covers <strong>1,340 conflicts</strong> spanning roughly{' '}
              <strong>2500 BCE to today</strong>, with <strong>372 distinct polities (empires, kingdoms,
              caliphates, republics, dynasties)</strong> whose borders shift through time, and{' '}
              <strong>~700 historical city-name records</strong> that fade in and out as cities are
              renamed.
            </p>
            <p className="mt-2 text-xs text-wars-muted">
              <strong className="text-wars-text">Dataset version:</strong> May 2026.
              Casualty figures for ongoing conflicts (Russo-Ukrainian War, Israel-Hamas War, Sudan
              Conflict, Yemeni Civil War, Myanmar Civil War, and others) are point-in-time snapshots
              and should be cross-checked against current reporting.
            </p>
          </Section>

          {/* How to read borders */}
          <Section heading="How to read empire borders">
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1.5 w-12 h-0.5 bg-wars-text" />
                <div>
                  <strong className="text-wars-text">Solid line = canonical border.</strong> The
                  polygon follows real coastlines and modern political boundaries. Use these as a
                  reasonable proxy for the empire&apos;s extent at this resolution.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1.5 w-12 h-0.5 border-t border-dashed border-wars-text" style={{ borderTopWidth: '2px' }} />
                <div>
                  <strong className="text-wars-text">Dashed line = approximate border.</strong> The
                  polygon is our best estimate; the historical extent is contested, fluid, or simply
                  not well-documented at this resolution. Don&apos;t cite these as fact.
                </div>
              </div>
              <p className="text-xs text-wars-muted mt-3">
                Most empire borders shown are dashed (approximate); only a minority are reconstructed
                from canonical historical-basemap data or hand-crafted from scholarly atlases.
                We err toward honesty over false precision.
              </p>
            </div>
          </Section>

          {/* Sources */}
          <Section heading="Where the data comes from">
            <ul className="list-disc list-inside space-y-1.5 marker:text-wars-muted">
              <li>
                <strong>Conflict facts</strong>: Wikipedia (linked per conflict, ~91% have URLs;
                content reused under{' '}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-wars-text">CC BY-SA 4.0</a>),
                cross-referenced with Clodfelter&apos;s <em>Warfare and Armed Conflicts</em>,
                Rummel&apos;s <em>Death by Government</em>, and the Uppsala Conflict Data Program for
                post-1945 data.
              </li>
              <li>
                <strong>Empire summaries</strong>: Lead paragraphs from English Wikipedia, fetched
                via the public summary API and shown with attribution (CC BY-SA 4.0).
              </li>
              <li>
                <strong>Modern country shapes</strong>:{' '}
                <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-wars-text">Natural Earth</a>{' '}
                10m cultural vectors (public domain).
              </li>
              <li>
                <strong>Historical empire boundaries</strong>: Combination of{' '}
                <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener noreferrer" className="underline hover:text-wars-text">aourednik / historical-basemaps</a>{' '}
                (CC BY-SA 4.0), modern country unions where they approximate the empire (e.g., the
                Mongol Empire as a union of modern Eurasian countries), and hand-constructed
                polygons from scholarly atlases — always marked dashed where extent is approximate.
              </li>
              <li>
                <strong>Basemap tiles &amp; styling</strong>:{' '}
                <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer" className="underline hover:text-wars-text">© Mapbox</a>{' '}
                ·{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-wars-text">© OpenStreetMap contributors</a>{' '}
                (data under{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-wars-text">ODbL</a>).
              </li>
              <li>
                <strong>Historical city names</strong>: Curated from primary historical sources;
                each entry has its own date range so labels fade between names (Byzantium →
                Constantinople → Konstantiniyye → Istanbul).
              </li>
            </ul>
            <p className="mt-3 text-xs text-wars-muted">
              A consolidated attribution and corrections page lives at{' '}
              <a href="/sources" className="underline hover:text-wars-text">/sources</a>.
            </p>
          </Section>

          {/* Casualty methodology */}
          <Section heading="How casualty figures work">
            <p>
              Where shown, the headline number is a single <em>median or best-estimate</em> figure.
              For ~70 of the most-cited conflicts (World Wars, Mongol Conquests, Taiping, Holocaust,
              An Lushan Rebellion, etc.) we additionally show a <em>range</em> reflecting the genuine
              spread in scholarly estimates, with the source and notes on why historians disagree.
            </p>
            <p className="mt-2 text-xs text-wars-muted">
              For pre-modern conflicts especially, casualty figures should be read as orders of
              magnitude, not precise counts. Some pre-1500 figures derive from primary sources
              (often censuses showing population loss) that conflate war deaths with famine, plague,
              and displacement.
            </p>
          </Section>

          {/* Importance */}
          <Section heading="What “importance” means">
            <p>
              Conflicts are rated 1–5 for visual prominence on the map and timeline. The rating is
              editorial, weighted by casualties, duration, geographic scope, and downstream
              historical significance. It&apos;s not a value judgment about which lives mattered.
              We&apos;re actively working to remove Eurocentric bias from these ratings.
            </p>
          </Section>

          {/* Limitations */}
          <Section heading="Known limitations">
            <ul className="list-disc list-inside space-y-1.5 marker:text-wars-muted">
              <li>
                <strong>Coverage bias</strong>: Pre-1500 conflicts are sparser; coverage of
                pre-colonial Americas, sub-Saharan Africa, and Pacific Islander polities is
                improving but still thinner than European/Mediterranean coverage.
              </li>
              <li>
                <strong>Border resolution</strong>: Polygons are simplified to ~2 km tolerance for
                most empires, ~5–11 km for globe-spanning ones (British Empire, Russian Empire). At
                that resolution, individual peninsulas and small islands may be approximated.
              </li>
              <li>
                <strong>Disputed territories</strong>: Modern country shapes from Natural Earth
                follow internationally recognized borders. Crimea is shown as Ukrainian; Taiwan as
                separate; Palestinian territories as separate from Israel; Kashmir is split. These
                choices reflect Natural Earth&apos;s convention, not endorsement of any party&apos;s
                claim.
              </li>
              <li>
                <strong>Naming</strong>: Place names use modern canonical forms in modern contexts
                (Mumbai, not Bombay; Kyiv, not Kiev) and historical names where appropriate
                (Constantinople for the Byzantine period). We&apos;re still cleaning legacy data.
              </li>
              <li>
                <strong>Ongoing conflicts</strong>: Casualty figures for active wars (Ukraine, Yemen,
                Sudan, Tigray, Myanmar) move every week. The numbers here are point-in-time
                snapshots and should be cross-checked against current reporting.
              </li>
            </ul>
          </Section>

          {/* Keyboard shortcuts */}
          <Section heading="Keyboard shortcuts">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
              <Kbd label="Play / Pause" keys="Space" />
              <Kbd label="Scrub ±10 years" keys="← →" />
              <Kbd label="Scrub ±100 years" keys="Shift + ← →" />
              <Kbd label="Jump to present" keys="L" />
              <Kbd label="Close panels" keys="Esc" />
              <Kbd label="Open this dialog" keys="?" />
            </div>
            <p className="text-xs text-wars-muted mt-3">
              The URL hash tracks the current year — copy it to share a specific moment in history.
            </p>
          </Section>

          {/* Citation */}
          <Section heading="Citing or embedding">
            <p>
              Wars Atlas is a work in progress and not yet a stable scholarly resource. If you cite
              it, please include the URL and a date, and prefer the underlying Wikipedia / Natural
              Earth / Clodfelter sources for the actual claims. We expect to publish a versioned
              dataset and methodology paper in a future release.
            </p>
          </Section>

          {/* Corrections / feedback channel — flagged here so high-volume traffic
              has a clear place to route corrections rather than DMing the maintainer. */}
          <Section heading="Corrections &amp; feedback">
            <p>
              Spotted a wrong date, an under-counted casualty figure, an empire boundary that
              looks off, or a war that&apos;s missing? We treat corrections as the highest-priority
              work.
            </p>
            <p className="mt-2">
              Open an issue on{' '}
              <a
                href={process.env.NEXT_PUBLIC_FEEDBACK_URL || 'https://github.com/wars-atlas/wars-atlas/issues'}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-wars-text"
              >
                the issue tracker
              </a>
              . Please include the conflict / empire ID (visible in the sidebar footer in mono
              type) and a citation for the correction.
            </p>
          </Section>

          {/* Footer */}
          <div className="pt-4 border-t border-wars-border/50 text-xs text-wars-muted/70">
            Wars Atlas is a research preview. Numbers, names, and borders shown here are not the
            last word — please verify against primary sources before citing.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold text-wars-muted uppercase tracking-wider mb-2">
        {heading}
      </h3>
      <div className="text-sm text-wars-text/90 leading-relaxed">{children}</div>
    </section>
  );
}

function Kbd({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-wars-muted">{label}</span>
      <kbd className="px-2 py-0.5 bg-wars-bg border border-wars-border/70 rounded text-[11px] text-wars-text font-mono">
        {keys}
      </kbd>
    </div>
  );
}
