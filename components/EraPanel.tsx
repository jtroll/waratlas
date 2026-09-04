'use client';

import { useEffect, useState } from 'react';
import { formatYear } from '@/lib/format';

interface Era {
  start: number;
  end: number;
  name: string;
  blurb: string;
  themes: string[];
}

const ERAS: Era[] = [
  {
    start: -3500,
    end: -1200,
    name: 'Bronze Age',
    blurb:
      'The first urban civilizations — Sumer, Egypt, the Indus Valley, Shang China — write the earliest war records on clay and stone.',
    themes: ['Chariot warfare', 'fortified city-states', 'dynastic conquest', 'mass deportation'],
  },
  {
    start: -1200,
    end: -500,
    name: 'Iron Age',
    blurb:
      'Iron weapons democratize armies. The Bronze Age collapse shatters Mediterranean civilization; new powers — Assyria, Persia, Zhou China — rise in its wake.',
    themes: ['Iron metallurgy', 'mass infantry', 'imperial bureaucracy', 'sea peoples'],
  },
  {
    start: -500,
    end: 500,
    name: 'Classical Antiquity',
    blurb:
      'Mediterranean empires (Persia, Athens, Macedon, Rome) and Asian counterparts (Maurya, Han) fight wars whose ideas — citizenship, legions, civil service — outlive their empires.',
    themes: ['Phalanx and legion', 'professional armies', 'imperial overstretch', 'religious empires'],
  },
  {
    start: 500,
    end: 1450,
    name: 'Medieval',
    blurb:
      'Steppe horsemen reshape three continents — Arabs, Mongols, Turks. Feudal Europe, Tang and Song China, the Caliphates, and Mesoamerican empires all rise and contract.',
    themes: ['Cavalry empires', 'Crusades and jihad', 'nomadic conquest', 'plague'],
  },
  {
    start: 1450,
    end: 1789,
    name: 'Early Modern',
    blurb:
      'Gunpowder, oceanic navigation, and joint-stock companies industrialize war and conquest. European powers seize most of the Americas, Africa, and South Asia.',
    themes: ['Gunpowder revolution', 'settler colonialism', 'transatlantic slavery', 'religious wars'],
  },
  {
    start: 1789,
    end: 1914,
    name: 'Long 19th Century',
    blurb:
      "Industrial production, conscript armies, railroads, and ideologies of nationalism transform war's scale. Empires consolidate; the Americas decolonize.",
    themes: ['Total war', 'mass conscription', 'industrial logistics', 'scramble for Africa'],
  },
  {
    start: 1914,
    end: 1989,
    name: '20th Century',
    blurb:
      'Two world wars, decolonization, and the Cold War. Industrial-scale killing, genocide, nuclear weapons, and proxy wars across the global South.',
    themes: ['Total war', 'ideological conflict', 'decolonization', 'nuclear deterrence'],
  },
  {
    start: 1989,
    end: 2100,
    name: 'Contemporary',
    blurb:
      'Civil wars, insurgencies, and asymmetric conflict dominate. The post-9/11 era, the resurgence of great-power competition, and the digitization of warfare reshape the map.',
    themes: ['Civil war', 'insurgency', 'drone warfare', 'cyber conflict'],
  },
];

function eraForYear(year: number): Era | null {
  return ERAS.find((e) => year >= e.start && year < e.end) ?? null;
}

function formatBound(y: number): string {
  if (y >= 2100) return 'today';
  return formatYear(y);
}

interface Props {
  year: number;
}

/**
 * Era context "wall card" — appears when the timeline crosses an era boundary.
 *
 * Editorial polish (step 6): amber "Exhibit · Era" eyebrow, serif title,
 * italic blurb, theme chips with hairline borders.
 */
export default function EraPanel({ year }: Props) {
  const [shown, setShown] = useState<{ era: Era; key: string } | null>(null);
  // Collapsed = card minimized to a left-edge tab. The tab persists so
  // the user can re-expand the card at will; previously this was a
  // one-shot "dismissed" flag that hid the card permanently for the era.
  const [collapsed, setCollapsed] = useState(false);
  // Keyed on the era NAME, not the float year: during playback the year
  // changes every frame, and re-running this per frame would un-collapse
  // the card immediately after the user (or the 12 s timer) collapsed it.
  const eraName = eraForYear(year)?.name ?? null;

  useEffect(() => {
    if (!eraName) return;
    const era = ERAS.find((e) => e.name === eraName);
    if (!era) return;
    setShown({ era, key: era.name + '-' + Date.now() });
    setCollapsed(false);
  }, [eraName]);

  // Auto-collapse after 12s (the tab remains so the user can pull it back)
  useEffect(() => {
    if (!shown || collapsed) return;
    const t = setTimeout(() => setCollapsed(true), 12_000);
    return () => clearTimeout(t);
  }, [shown, collapsed]);

  if (!shown) return null;

  // Collapsed state: a small tab stuck to the left edge with a right-facing
  // carrot, showing the current era name. Clicking it re-expands the card.
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute top-20 left-0 z-30 hidden md:inline-flex items-center gap-2 transition-colors hover:text-wars-text group"
        style={{
          height: 36,
          padding: '0 12px 0 14px',
          background: 'oklch(0.20 0.014 250 / 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid var(--rule-strong)',
          borderLeft: 'none',
          color: 'var(--ink-text-2)',
          cursor: 'pointer',
        }}
        aria-label={`Expand era card: ${shown.era.name}`}
        title={`Expand: ${shown.era.name}`}
      >
        <span
          className="eyebrow"
          style={{ color: 'var(--amber)', fontSize: 9 }}
        >
          Era
        </span>
        <span
          className="font-display"
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-text)' }}
        >
          {shown.era.name}
        </span>
        <svg
          width="8"
          height="10"
          viewBox="0 0 8 10"
          aria-hidden="true"
          className="opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ marginLeft: 2 }}
        >
          <path
            d="M1.5 1 L6 5 L1.5 9"
            stroke="currentColor"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <aside
      key={shown.key}
      className="era-panel-enter absolute top-20 left-6 z-30 hidden md:block"
      style={{
        width: 290,
        background: 'oklch(0.20 0.014 250 / 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--rule-strong)',
        padding: '14px 18px 16px',
        boxShadow: 'var(--shadow-panel)',
      }}
      role="region"
      aria-label={`Era: ${shown.era.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div
            className="eyebrow mb-1.5"
            style={{ color: 'var(--amber)' }}
          >
            Exhibit · Era
          </div>
          <h3
            className="font-display"
            style={{
              margin: 0,
              fontSize: 20,
              lineHeight: 1.15,
              fontWeight: 500,
              letterSpacing: '-0.012em',
              color: 'var(--ink-text)',
            }}
          >
            {shown.era.name}
          </h3>
          <div
            className="font-mono mt-1 text-wars-faint"
            style={{ fontSize: 10, letterSpacing: '0.04em' }}
          >
            {formatBound(shown.era.start)} — {formatBound(shown.era.end)}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-wars-muted hover:text-wars-text transition-colors -mr-1"
          style={{
            border: '1px solid var(--rule)',
            background: 'transparent',
          }}
          aria-label="Collapse era panel"
          title="Collapse — click the left-edge tab to bring it back"
        >
          <svg width="9" height="9" viewBox="0 0 9 9">
            <path
              d="M1 1 L8 8 M8 1 L1 8"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </div>

      <p
        className="font-display italic mt-3 mb-3"
        style={{
          fontSize: 13.5,
          lineHeight: 1.55,
          color: 'var(--ink-text-2)',
          margin: '12px 0 12px',
          textWrap: 'pretty' as React.CSSProperties['textWrap'],
        }}
      >
        {shown.era.blurb}
      </p>

      {shown.era.themes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {shown.era.themes.map((t) => (
            <span
              key={t}
              className="font-ui text-wars-muted"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.02em',
                padding: '2px 6px',
                border: '1px solid var(--rule)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}
