'use client';

import { useEffect, useState } from 'react';

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
  if (y < 0) return `${-y} BCE`;
  if (y >= 2100) return 'today';
  return `${y} CE`;
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
  const [dismissed, setDismissed] = useState(false);
  const eraSlot = Math.floor(year / 5);

  useEffect(() => {
    const era = eraForYear(year);
    if (!era) return;
    setShown((prev) => {
      if (prev && prev.era.name === era.name) return prev;
      return { era, key: era.name + '-' + Date.now() };
    });
    setDismissed(false);
  }, [eraSlot, year]);

  // Auto-hide after 12s
  useEffect(() => {
    if (!shown || dismissed) return;
    const t = setTimeout(() => setDismissed(true), 12_000);
    return () => clearTimeout(t);
  }, [shown, dismissed]);

  if (!shown || dismissed) return null;

  return (
    <aside
      key={shown.key}
      className="era-panel-enter absolute top-20 left-6 z-30 hidden md:block"
      style={{
        width: 290,
        background: 'oklch(0.20 0.014 250 / 0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-wars-muted hover:text-wars-text transition-colors -mr-1"
          style={{
            border: '1px solid var(--rule)',
            background: 'transparent',
          }}
          aria-label="Dismiss era panel"
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
