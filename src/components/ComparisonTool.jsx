import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ComparisonTool.css';

const SPICET = [
  { key: 'social', label: 'Social', color: '#E74C3C', icon: 'S', emoji: '👥' },
  { key: 'political', label: 'Political', color: '#3498DB', icon: 'P', emoji: '🏛' },
  { key: 'interactions', label: 'Interactions', color: '#2ECC71', icon: 'I', emoji: '🌍' },
  { key: 'cultural', label: 'Cultural', color: '#9B59B6', icon: 'C', emoji: '🎭' },
  { key: 'economic', label: 'Economic', color: '#F39C12', icon: 'E', emoji: '💰' },
  { key: 'technology', label: 'Technology', color: '#1ABC9C', icon: 'T', emoji: '⚙' },
];

// Suggested comparison pairs for AP World
const SUGGESTED_PAIRS = [
  { a: 'evt-meiji-restoration', b: 'evt-tanzimat-reforms', label: 'Defensive modernization: Japan vs Ottoman Empire' },
  { a: 'evt-french-revolution', b: 'evt-haitian-revolution', label: 'Revolutionary ideals: France vs Haiti' },
  { a: 'evt-mongol-empire', b: 'evt-ottoman-empire', label: 'Empire building: Mongols vs Ottomans' },
  { a: 'evt-song-dynasty', b: 'evt-industrial-revolution', label: 'Technological innovation across eras' },
  { a: 'evt-atlantic-slave-trade', b: 'evt-indian-ocean-trade', label: 'Trade networks: Atlantic vs Indian Ocean' },
  { a: 'evt-world-war-1', b: 'evt-world-war-2', label: 'World Wars: causes and consequences' },
  { a: 'evt-russian-revolution', b: 'evt-chinese-revolution', label: 'Communist revolutions compared' },
  { a: 'evt-aztec-empire', b: 'evt-inca-empire', label: 'Pre-Columbian Americas: Aztec vs Inca' },
  { a: 'evt-scramble-for-africa', b: 'evt-opium-wars', label: 'Imperialism: Africa vs China' },
  { a: 'evt-mughal-empire', b: 'evt-ottoman-empire', label: 'Gunpowder Empires compared' },
];

export default function ComparisonTool({ data }) {
  const [eventA, setEventA] = useState(null);
  const [eventB, setEventB] = useState(null);
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [focusedSelector, setFocusedSelector] = useState(null); // 'a' | 'b' | null
  const [activeTheme, setActiveTheme] = useState(null); // highlight a specific theme

  const allEvents = useMemo(() => {
    const events = [];
    for (const era of data.eras) {
      for (const event of era.events) {
        events.push({ ...event, eraTitle: era.title, eraColor: era.color });
      }
    }
    return events;
  }, [data]);

  const filterEvents = (query) => {
    if (!query.trim()) return allEvents;
    const q = query.toLowerCase();
    return allEvents.filter(e =>
      e.title.toLowerCase().includes(q) ||
      e.eraTitle.toLowerCase().includes(q) ||
      (e.keyTerms || []).some(t => t.toLowerCase().includes(q))
    );
  };

  const selectEvent = (event, side) => {
    if (side === 'a') { setEventA(event); setSearchA(''); }
    else { setEventB(event); setSearchB(''); }
    setFocusedSelector(null);
  };

  const loadSuggested = (pair) => {
    setEventA(allEvents.find(e => e.id === pair.a) || null);
    setEventB(allEvents.find(e => e.id === pair.b) || null);
  };

  const swapEvents = () => {
    const tmp = eventA;
    setEventA(eventB);
    setEventB(tmp);
  };

  const hasComparison = eventA && eventB;

  return (
    <div className="comparison-tool">
      {/* Header */}
      <div className="ct-header">
        <h2 className="ct-title">Compare & Contrast</h2>
        <p className="ct-subtitle">Select two events to compare their SPICE-T themes side by side</p>
      </div>

      {/* Event selectors */}
      <div className="ct-selectors">
        <EventSelector
          label="Event A"
          event={eventA}
          search={searchA}
          setSearch={setSearchA}
          allEvents={allEvents}
          filterEvents={filterEvents}
          onSelect={(e) => selectEvent(e, 'a')}
          onClear={() => setEventA(null)}
          focused={focusedSelector === 'a'}
          onFocus={() => setFocusedSelector('a')}
          onBlur={() => setTimeout(() => setFocusedSelector(null), 150)}
          otherEvent={eventB}
        />

        <button className="ct-swap" onClick={swapEvents} title="Swap events" disabled={!eventA && !eventB}>
          ⇄
        </button>

        <EventSelector
          label="Event B"
          event={eventB}
          search={searchB}
          setSearch={setSearchB}
          allEvents={allEvents}
          filterEvents={filterEvents}
          onSelect={(e) => selectEvent(e, 'b')}
          onClear={() => setEventB(null)}
          focused={focusedSelector === 'b'}
          onFocus={() => setFocusedSelector('b')}
          onBlur={() => setTimeout(() => setFocusedSelector(null), 150)}
          otherEvent={eventA}
        />
      </div>

      {/* Suggested pairs */}
      {!hasComparison && (
        <motion.div className="ct-suggestions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="ct-section-title">Suggested AP Comparisons</h3>
          <div className="ct-suggest-grid">
            {SUGGESTED_PAIRS.map((pair, i) => {
              const a = allEvents.find(e => e.id === pair.a);
              const b = allEvents.find(e => e.id === pair.b);
              if (!a || !b) return null;
              return (
                <motion.button
                  key={i}
                  className="ct-suggest-card"
                  onClick={() => loadSuggested(pair)}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="ct-suggest-events">
                    <span className="ct-suggest-event" style={{ borderColor: a.color }}>
                      {a.hoverImage && <img src={a.hoverImage} alt="" className="ct-suggest-img" />}
                      <span>{a.title}</span>
                    </span>
                    <span className="ct-suggest-vs">vs</span>
                    <span className="ct-suggest-event" style={{ borderColor: b.color }}>
                      {b.hoverImage && <img src={b.hoverImage} alt="" className="ct-suggest-img" />}
                      <span>{b.title}</span>
                    </span>
                  </div>
                  <div className="ct-suggest-label">{pair.label}</div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Comparison table */}
      <AnimatePresence>
        {hasComparison && (
          <motion.div
            className="ct-comparison"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Theme filter */}
            <div className="ct-theme-tabs">
              <button
                className={`ct-theme-tab ${!activeTheme ? 'active' : ''}`}
                onClick={() => setActiveTheme(null)}
              >
                All Themes
              </button>
              {SPICET.map(t => (
                <button
                  key={t.key}
                  className={`ct-theme-tab ${activeTheme === t.key ? 'active' : ''}`}
                  style={activeTheme === t.key ? { borderColor: t.color, color: t.color } : {}}
                  onClick={() => setActiveTheme(activeTheme === t.key ? null : t.key)}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* Event headers */}
            <div className="ct-table-header">
              <div className="ct-th ct-th-a">
                <div className="ct-th-color" style={{ background: eventA.color }} />
                {eventA.hoverImage && <img src={eventA.hoverImage} alt="" className="ct-th-img" />}
                <div>
                  <div className="ct-th-title">{eventA.title}</div>
                  <div className="ct-th-dates">{eventA.startYear}–{eventA.endYear} · <span style={{ color: eventA.eraColor }}>{eventA.eraTitle}</span></div>
                </div>
              </div>
              <div className="ct-th-divider">vs</div>
              <div className="ct-th ct-th-b">
                <div className="ct-th-color" style={{ background: eventB.color }} />
                {eventB.hoverImage && <img src={eventB.hoverImage} alt="" className="ct-th-img" />}
                <div>
                  <div className="ct-th-title">{eventB.title}</div>
                  <div className="ct-th-dates">{eventB.startYear}–{eventB.endYear} · <span style={{ color: eventB.eraColor }}>{eventB.eraTitle}</span></div>
                </div>
              </div>
            </div>

            {/* SPICE-T rows */}
            <div className="ct-rows">
              {SPICET
                .filter(t => !activeTheme || t.key === activeTheme)
                .map((theme, i) => {
                  const contentA = eventA.spiceT?.[theme.key] || 'No data available';
                  const contentB = eventB.spiceT?.[theme.key] || 'No data available';
                  return (
                    <motion.div
                      key={theme.key}
                      className="ct-row"
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div className="ct-row-label" style={{ '--theme-color': theme.color }}>
                        <span className="ct-row-icon" style={{ background: theme.color + '20', color: theme.color }}>{theme.icon}</span>
                        <span className="ct-row-name">{theme.label}</span>
                      </div>
                      <div className="ct-row-content">
                        <div className="ct-cell ct-cell-a" style={{ borderLeftColor: eventA.color }}>
                          {contentA}
                        </div>
                        <div className="ct-cell ct-cell-b" style={{ borderLeftColor: eventB.color }}>
                          {contentB}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            {/* Key terms comparison */}
            <div className="ct-keyterms-section">
              <h3 className="ct-section-title">Key Terms</h3>
              <div className="ct-keyterms-grid">
                <div className="ct-keyterms-col">
                  <div className="ct-keyterms-header" style={{ borderColor: eventA.color }}>{eventA.title}</div>
                  <div className="ct-keyterms-list">
                    {(eventA.keyTerms || []).map(t => {
                      const shared = (eventB.keyTerms || []).includes(t);
                      return <span key={t} className={`ct-term ${shared ? 'shared' : ''}`}>{t}</span>;
                    })}
                  </div>
                </div>
                <div className="ct-keyterms-col">
                  <div className="ct-keyterms-header" style={{ borderColor: eventB.color }}>{eventB.title}</div>
                  <div className="ct-keyterms-list">
                    {(eventB.keyTerms || []).map(t => {
                      const shared = (eventA.keyTerms || []).includes(t);
                      return <span key={t} className={`ct-term ${shared ? 'shared' : ''}`}>{t}</span>;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Essay prompt helper */}
            <div className="ct-essay-prompt">
              <h3 className="ct-section-title">AP Essay Prompt</h3>
              <div className="ct-prompt-card">
                <div className="ct-prompt-text">
                  Compare and contrast the <strong>{eventA.title}</strong> ({eventA.startYear}–{eventA.endYear}) and the <strong>{eventB.title}</strong> ({eventB.startYear}–{eventB.endYear}). Analyze similarities and differences in terms of their political, economic, and social impacts.
                </div>
                <div className="ct-prompt-tips">
                  <div className="ct-tip-title">Thesis Tips:</div>
                  <ul className="ct-tip-list">
                    <li>Start with a clear claim about both similarity AND difference</li>
                    <li>Use specific SPICE-T categories to organize your argument</li>
                    <li>Include specific evidence (dates, names, key terms) from both events</li>
                    <li>Explain WHY the similarities/differences matter historically</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Event selector sub-component
function EventSelector({ label, event, search, setSearch, filterEvents, onSelect, onClear, focused, onFocus, onBlur, otherEvent }) {
  const results = filterEvents(search).filter(e => e.id !== otherEvent?.id);

  return (
    <div className="ct-selector">
      <div className="ct-selector-label">{label}</div>
      {event ? (
        <div className="ct-selected" style={{ borderColor: event.color }}>
          {event.hoverImage && <img src={event.hoverImage} alt="" className="ct-selected-img" />}
          <div className="ct-selected-info">
            <div className="ct-selected-title">{event.title}</div>
            <div className="ct-selected-dates">{event.startYear}–{event.endYear}</div>
          </div>
          <button className="ct-selected-clear" onClick={onClear}>&times;</button>
        </div>
      ) : (
        <div className="ct-search-wrapper">
          <input
            className="ct-search"
            placeholder="Search for an event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          {focused && search.trim() && results.length > 0 && (
            <div className="ct-search-dropdown">
              {results.slice(0, 8).map(e => (
                <button key={e.id} className="ct-search-result" onMouseDown={() => onSelect(e)}>
                  <span className="ct-sr-color" style={{ background: e.color }} />
                  <span className="ct-sr-title">{e.title}</span>
                  <span className="ct-sr-dates">{e.startYear}–{e.endYear}</span>
                </button>
              ))}
            </div>
          )}
          {focused && !search.trim() && (
            <div className="ct-search-dropdown">
              {results.slice(0, 6).map(e => (
                <button key={e.id} className="ct-search-result" onMouseDown={() => onSelect(e)}>
                  <span className="ct-sr-color" style={{ background: e.color }} />
                  <span className="ct-sr-title">{e.title}</span>
                  <span className="ct-sr-dates">{e.startYear}–{e.endYear}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
