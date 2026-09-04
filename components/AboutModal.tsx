'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import stats from '@/lib/generated/stats.json';
import { useFocusTrap } from '@/lib/focus-trap';
import { MAP_SHORTCUTS } from '@/lib/shortcuts';
import { EXHIBITS } from '@/lib/exhibits';
import { HASH_PARAMS } from '@/lib/hash';

/** One worked example per hash parameter, keyed by the param name used in
 *  HASH_PARAMS. Kept here (not in lib/hash.ts) because they are prose. */
const HASH_EXAMPLES: Record<string, string> = {
  year: '/#year=-490',
  conflict: '/#year=1939&conflict=world-war-2',
  empire: '/#year=1206&empire=mongol-empire',
  exhibit: '/#exhibit=mongol-century',
  'lat, lon': '/#year=1942&lat=48.85&lon=2.35&zoom=4.2',
  zoom: '/#year=1942&lat=48.85&lon=2.35&zoom=4.2',
};

const STAT_CONFLICTS = stats.conflicts.toLocaleString('en-US');
const STAT_EMPIRES = stats.empires.toLocaleString('en-US');
const STAT_CITIES = `~${(Math.round(stats.cities / 100) * 100).toLocaleString('en-US')}`;
const STAT_RANGES = stats.casualtyRanges.toLocaleString('en-US');
const SOLID_PCT = stats.empires > 0 ? Math.round((stats.solidEmpires / stats.empires) * 100) : 0;

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * About / Methodology modal. Linked from the "?" button in the TopBar.
 * Designed to satisfy researcher / journalist scrutiny of the data.
 *
 * Rendered via portal to document.body so the modal escapes the TopBar's
 * stacking context (z-30) — otherwise the Timeline (also z-30, but later in
 * DOM order) renders over the bottom of the modal.
 */
export default function AboutModal({ open, onClose }: AboutModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useFocusTrap(panelRef, open && mounted);

  if (!open || !mounted) return null;

  const modal = (
    <div
      className="scrim fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="surface-sheet relative w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto"
        style={{ boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        {/* Header */}
        <div className="surface-sheet border-0 hairline-b sticky top-0 z-10 px-5 sm:px-6 pt-4 pb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow m-0 mb-1.5">About · Methodology</p>
            <h2
              id="about-title"
              className="font-display text-display-l text-wars-text m-0"
              style={{ fontWeight: 400 }}
            >
              <span style={{ fontStyle: 'italic', color: 'var(--vermilion)' }}>War</span>
              <span style={{ marginLeft: 5 }}>Atlas</span>
            </h2>
            <p className="font-display italic text-body-s text-wars-muted m-0 mt-1">
              An interactive history of armed conflict
            </p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn flex-shrink-0" aria-label="Close about dialog">
            <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden>
              <path d="M1 1 L10 10 M10 1 L1 10" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 sm:px-6 py-5 space-y-7">
          {/* Intro */}
          <Section heading="What this is">
            <p>
              War Atlas <em>intends</em> to be an interactive map of every armed conflict in
              recorded human history, layered over evolving empire borders. Scrub the timeline
              to watch the political map change while wars appear and resolve.
            </p>
            <p>
              The dataset currently covers <strong>{STAT_CONFLICTS} conflicts</strong> spanning roughly{' '}
              <strong>3100 BCE to today</strong>, with <strong>{STAT_EMPIRES} distinct polities (empires, kingdoms,
              caliphates, republics, dynasties)</strong> whose borders shift through time, and{' '}
              <strong>{STAT_CITIES} historical city-name records</strong> that fade in and out as cities are
              renamed. This project stemmed out of an offhand conversation between friends in
              2009, finally put into this beta release in May 2026. It has been assembled via
              countless amazing open source resources, Claude Cowork, and several late nights.
            </p>
            <Aside>
              <strong>Dataset version:</strong> May 2026.
              Casualty figures for ongoing conflicts (Russo-Ukrainian War, Israel-Hamas War, Sudan
              Conflict, Yemeni Civil War, Myanmar Civil War, and others) are point-in-time snapshots
              and should be cross-checked against current reporting.
            </Aside>
          </Section>

          {/* Exhibits — curated routes through the atlas */}
          <Section heading="Exhibits">
            <p>
              Guided routes through the atlas: each stop seeks the timeline, flies
              the map, and opens the record it is about. Start one from the Tour
              menu, or follow a link below.
            </p>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {EXHIBITS.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-baseline justify-between gap-4"
                  style={{ padding: '6px 0', borderBottom: '1px dotted var(--rule)' }}
                >
                  <span className="min-w-0">
                    <a href={`/#exhibit=${ex.id}`} onClick={onClose}>{ex.title}</a>
                    <span className="block text-wars-muted" style={{ fontSize: 13 }}>{ex.summary}</span>
                  </span>
                  <span className="font-mono text-mono text-wars-faint flex-shrink-0">
                    {ex.stops.length} stops
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* How to read borders */}
          <Section heading="How to read empire borders">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg width="44" height="8" className="flex-shrink-0 mt-2" aria-hidden>
                  <line x1="0" y1="4" x2="44" y2="4" stroke="var(--ink-text-2)" strokeWidth="1.5" />
                </svg>
                <div>
                  <strong>Solid line = canonical border.</strong> The
                  polygon follows real coastlines and modern political boundaries. Use these as a
                  reasonable proxy for the empire&apos;s extent at this resolution.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg width="44" height="8" className="flex-shrink-0 mt-2" aria-hidden>
                  <line x1="0" y1="4" x2="44" y2="4" stroke="var(--uncertain)" strokeWidth="1.2" strokeDasharray="4 4" />
                </svg>
                <div>
                  <strong>Dashed line = approximate border.</strong> The
                  polygon is our best estimate; the historical extent is contested, fluid, or simply
                  not well-documented at this resolution. Don&apos;t cite these as fact.
                </div>
              </div>
              <Aside>
                Of the {STAT_EMPIRES} polities currently in the dataset, roughly a third (≈ {SOLID_PCT} %) carry
                solid borders sourced from canonical historical-basemap data, and the rest
                are dashed approximations (the 2026 indigenous-Americas expansion
                added many honestly-approximate pre-Columbian borders). The dashed/solid distinction is enforced
                consistently — if a polygon is dashed, don&apos;t cite the line.
              </Aside>
            </div>
          </Section>

          {/* Sources */}
          <Section heading="Where the data comes from">
            <ul>
              <li>
                <strong>Conflict facts</strong>: Wikipedia (linked per conflict, ~91% have URLs;
                content reused under{' '}
                <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>),
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
                <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a>{' '}
                10m cultural vectors (public domain).
              </li>
              <li>
                <strong>Historical empire boundaries</strong>: Combination of{' '}
                <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener noreferrer">aourednik / historical-basemaps</a>{' '}
                (GPL-3.0), modern country unions where they approximate the empire (e.g., the
                Mongol Empire as a union of modern Eurasian countries), and hand-constructed
                polygons from scholarly atlases — always marked dashed where extent is approximate.
              </li>
              <li>
                <strong>Basemap tiles &amp; styling</strong>:{' '}
                <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer">© Mapbox</a>{' '}
                ·{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>{' '}
                (data under{' '}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">ODbL</a>).
              </li>
              <li>
                <strong>Historical city names</strong>: Curated from primary historical sources;
                each entry has its own date range so labels fade between names (Byzantium →
                Constantinople → Konstantiniyye → Istanbul).
              </li>
            </ul>
          </Section>

          {/* Casualty methodology */}
          <Section heading="How casualty figures work">
            <p>
              Where shown, the headline number is a single <em>median or best-estimate</em> figure.
              For {STAT_RANGES} of the most-cited conflicts (World Wars, Mongol Conquests, Taiping, Holocaust,
              An Lushan Rebellion, etc.) we additionally show a <em>range</em> reflecting the genuine
              spread in scholarly estimates, with the source and notes on why historians disagree.
            </p>
            <p>
              The headline figure is reported separately from <em>displacement</em>. Events whose
              defining toll is forced migration rather than killing — the Nakba, the Trail of Tears,
              the Partition of India — record the death range as the casualty figure and report
              displacement in the narrative, rather than rolling the two together as a single
              &ldquo;casualty&rdquo; number.
            </p>
            <Aside>
              For pre-modern conflicts especially, casualty figures should be read as orders of
              magnitude, not precise counts. Some pre-1500 figures derive from primary sources
              (often censuses showing population loss) that conflate war deaths with famine, plague,
              and displacement.
            </Aside>
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

          {/* Belligerent join */}
          <Section heading="“Wars of this empire”">
            <p>
              The empire panel lists conflicts whose belligerents include that
              polity. The join is <em>name-based</em>: each conflict&apos;s
              belligerent names are matched to an empire feature active at the
              conflict&apos;s start year, and stored on the record as{' '}
              <code>polityIds</code>. A match against any time-slice of the same
              polity (the British Empire has a dozen) counts. Where no record
              names a polity yet, the panel falls back to conflicts that merely
              overlap its dates, and says so. Limits are on the{' '}
              <a href="/sources">Sources page</a>.
            </p>
          </Section>

          {/* Historiography teaser — full discussion lives on /sources. */}
          <Section heading="Where the historians disagree">
            <p>
              Several of the most-quoted figures on this map are{' '}
              <em>actively disputed</em> in the scholarly literature. An Lushan
              (was the &ldquo;36 M dead&rdquo; census drop deaths, or
              registration collapse?), the Mongol conquests, the Taiping toll,
              the pre-Columbian population of the Americas, and most
              20th-century &ldquo;democide&rdquo; counts all have ranges that
              span an order of magnitude. We adopt mainstream point estimates
              and show ranges where they&apos;re well-attested; the{' '}
              <a href="/sources">Sources page</a>{' '}
              walks through the major debates so you know which numbers to
              trust and which to argue with.
            </p>
            <Aside>
              Naming, too, is interpretive. The atlas uses{' '}
              <em>Indian Rebellion of 1857</em> (not &ldquo;Mutiny&rdquo;),{' '}
              <em>Yihetuan Movement (Boxer Rebellion)</em>, and flags the term{' '}
              <em>Byzantine Empire</em> as a 16th-century coinage — the empire
              called itself Roman.
            </Aside>
          </Section>

          {/* Limitations */}
          <Section heading="Known limitations">
            <ul>
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
                <strong>Disputed territories</strong>: Modern borders come from Mapbox&apos;s
                boundary data and follow internationally recognized borders. Crimea is shown as
                Ukrainian; Taiwan as separate; Palestinian territories as separate from Israel;
                Kashmir is split. These choices reflect the basemap&apos;s convention, not
                endorsement of any party&apos;s claim.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5">
              <Kbd label="Play / Pause" keys="Space" />
              <Kbd label="Scrub ±10 years" keys="← →" />
              <Kbd label="Scrub ±100 years" keys="Shift + ← →" />
              <Kbd label="Jump to present" keys="L" />
              <Kbd label="Hide / show chrome" keys="T" />
              <Kbd label="Close panels" keys="Esc" />
              <Kbd label="Open this dialog" keys="?" />
              {MAP_SHORTCUTS.map((s) => (
                <Kbd key={s.keys} label={s.description} keys={s.keys} />
              ))}
            </div>
            <Aside>
              The URL hash tracks the current year, selection and camera — copy it
              to share a specific moment in history (see below).
            </Aside>
          </Section>

          {/* Sharing — the hash parameters */}
          <Section heading="Sharing the atlas">
            <p>
              Everything about the current view lives in the URL after the{' '}
              <code>#</code>, so a copied address reproduces it. Parameters are
              joined with <code>&amp;</code>:
            </p>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {HASH_PARAMS.map((h) => (
                <li key={h.param} style={{ padding: '6px 0', borderBottom: '1px dotted var(--rule)' }}>
                  <code className="text-wars-text">{h.param}</code>
                  <span className="block" style={{ fontSize: 13.5 }}>{h.description}</span>
                  {HASH_EXAMPLES[h.param] && (
                    <span className="block font-mono text-mono text-wars-faint mt-0.5">
                      e.g.{' '}
                      <a href={HASH_EXAMPLES[h.param]} onClick={onClose} style={{ color: 'inherit' }}>
                        {HASH_EXAMPLES[h.param]}
                      </a>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Aside>
              Conflicts and empires also have permanent, citable pages at{' '}
              <code>/c/&lt;id&gt;</code> and <code>/e/&lt;id&gt;</code> — the
              link icon in either panel goes there.
            </Aside>
          </Section>

          {/* Citation */}
          <Section heading="Citing or embedding">
            <p>
              War Atlas is a work in progress and not yet a stable scholarly resource. If you cite
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
            <p>
              Open an issue on{' '}
              <a
                href={process.env.NEXT_PUBLIC_FEEDBACK_URL || 'https://github.com/jtroll/waratlas/issues'}
                target="_blank"
                rel="noopener noreferrer"
              >
                the issue tracker
              </a>
              . Please include the conflict / empire ID (visible in the sidebar footer in mono
              type) and a citation for the correction.
            </p>
          </Section>

          {/* Read more — surfaces /sources and /changelog as chrome links,
              since neither is reachable from the map chrome on its own. */}
          <Section heading="Read more">
            <div className="flex flex-wrap gap-2">
              <ChromeLink href="/sources" label="Sources &amp; attribution" path="/SOURCES" />
              <ChromeLink href="/changelog" label="Changelog" path="/CHANGELOG" />
            </div>
            <Aside>
              Dataset revisions, border corrections, and methodology changes are
              logged on the changelog page. Citations and license details live on
              the sources page.
            </Aside>
          </Section>

          {/* Known similar projects */}
          <Section heading="Known similar projects">
            <p>
              Half a world away, developer Prakrit Ojha created{' '}
              <a href="https://www.war-atlas.org" target="_blank" rel="noopener noreferrer">
                www.war-atlas.org
              </a>{' '}
              that converged on several similar ideas but with his own unique spin — including game
              mechanics. Give it a spin!
            </p>
          </Section>

          {/* Footer */}
          <p
            className="font-mono text-mono text-wars-faint m-0 pt-4"
            style={{ borderTop: '1px dashed var(--rule)' }}
          >
            WARS-ATLAS · RESEARCH PREVIEW · numbers, names and borders shown here are not the
            last word — verify against primary sources before citing.
          </p>
        </div>

        <style>{`
          .about-prose p { margin: 0 0 10px; }
          .about-prose p:last-child { margin-bottom: 0; }
          .about-prose ul { margin: 0; padding-left: 1.1em; }
          .about-prose ul li { margin-bottom: 8px; }
          .about-prose ul li::marker { color: var(--ink-faint); }
          .about-prose strong { color: var(--ink-text); font-weight: 500; }
          .about-prose a { color: var(--indigo); text-decoration: none; border-bottom: 1px solid currentColor; }
          .about-prose a:hover { color: var(--ink-text); }
          .about-prose code { font-family: var(--font-mono), ui-monospace, monospace; font-size: 0.85em; padding: 1px 4px; background: var(--tint-ivory); border-radius: 2px; }
        `}</style>
      </div>
    </div>
  );

  // Portal to document.body so the modal escapes the TopBar's stacking
  // context (z-30) and lays cleanly over the Timeline, MobileTabDock, etc.
  return createPortal(modal, document.body);
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="eyebrow m-0 mb-2.5">{heading}</h3>
      <div
        className="about-prose font-display text-wars-text-2"
        style={{ fontSize: 14.5, lineHeight: 1.6 }}
      >
        {children}
      </div>
    </section>
  );
}

/** Secondary note under a section — smaller, muted, hairline on the left. */
function Aside({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-wars-muted mt-3"
      style={{ fontSize: 13, lineHeight: 1.55, paddingLeft: 12, borderLeft: '1px solid var(--rule-strong)' }}
    >
      {children}
    </p>
  );
}

function Kbd({ label, keys }: { label: string; keys: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5" style={{ borderBottom: '1px dotted var(--rule)' }}>
      <span className="font-ui text-wars-text-2" style={{ fontSize: 13 }}>{label}</span>
      <kbd
        className="font-mono text-mono text-wars-text px-2 py-0.5 rounded-chip"
        style={{ background: 'var(--ink-0)', border: '1px solid var(--rule-strong)' }}
      >
        {keys}
      </kbd>
    </div>
  );
}

function ChromeLink({ href, label, path }: { href: string; label: string; path: string }) {
  return (
    <a
      href={href}
      className="hover-tint inline-flex items-center gap-3 px-3 text-wars-text transition-colors"
      style={{ height: 36, border: '1px solid var(--rule-strong)', textDecoration: 'none' }}
    >
      <span className="font-display" style={{ fontSize: 14 }}>{label}</span>
      <span className="font-mono text-mono text-wars-muted">{path} →</span>
    </a>
  );
}
