import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './EssayPractice.css';

export default function EssayPractice({ data }) {
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'saq' | 'leq'
  const [selectedEra, setSelectedEra] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  const allPrompts = useMemo(() => {
    const prompts = [];
    for (const era of data.eras) {
      for (const event of era.events) {
        if (!event.essayPrompts) continue;
        if (event.essayPrompts.saq) {
          for (const saq of event.essayPrompts.saq) {
            prompts.push({ type: 'saq', event, era, prompt: saq });
          }
        }
        if (event.essayPrompts.leq) {
          for (const leq of event.essayPrompts.leq) {
            prompts.push({ type: 'leq', event, era, prompt: leq });
          }
        }
      }
    }
    return prompts;
  }, [data]);

  const filtered = allPrompts.filter(p => {
    if (selectedType !== 'all' && p.type !== selectedType) return false;
    if (selectedEra && p.era.id !== selectedEra) return false;
    return true;
  });

  return (
    <div className="essay-practice">
      <div className="ep-header">
        <h2 className="ep-title">SAQ / LEQ Practice</h2>
        <p className="ep-subtitle">Practice short answer and long essay questions in the AP World History format</p>
      </div>

      {/* Filters */}
      <div className="ep-filters">
        <div className="ep-type-filter">
          {[
            { key: 'all', label: 'All' },
            { key: 'saq', label: 'SAQ Only' },
            { key: 'leq', label: 'LEQ Only' },
          ].map(t => (
            <button
              key={t.key}
              className={`ep-filter-btn ${selectedType === t.key ? 'active' : ''}`}
              onClick={() => setSelectedType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ep-era-filter">
          <button
            className={`ep-filter-btn ${!selectedEra ? 'active' : ''}`}
            onClick={() => setSelectedEra(null)}
          >
            All Eras
          </button>
          {data.eras.map(era => (
            <button
              key={era.id}
              className={`ep-filter-btn ${selectedEra === era.id ? 'active' : ''}`}
              style={selectedEra === era.id ? { borderColor: era.color, color: era.color } : {}}
              onClick={() => setSelectedEra(selectedEra === era.id ? null : era.id)}
            >
              {era.startYear}–{era.endYear}
            </button>
          ))}
        </div>
      </div>

      <div className="ep-count">{filtered.length} prompt{filtered.length !== 1 ? 's' : ''}</div>

      {/* Prompt list */}
      <div className="ep-list">
        {filtered.map((item, i) => {
          const isExpanded = expandedCard === i;
          return (
            <motion.div
              key={`${item.event.id}-${item.type}-${i}`}
              className={`ep-card ${item.type}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: Math.min(0.3, i * 0.03) }}
            >
              <div className="ep-card-header" onClick={() => setExpandedCard(isExpanded ? null : i)}>
                <div className="ep-card-left">
                  <span className={`ep-badge ${item.type}`}>{item.type.toUpperCase()}</span>
                  <div className="ep-card-info">
                    <div className="ep-card-event">{item.event.title}</div>
                    <div className="ep-card-era" style={{ color: item.era.color }}>{item.era.title}</div>
                  </div>
                </div>
                <span className={`ep-chevron ${isExpanded ? 'open' : ''}`}>&#9662;</span>
              </div>

              <div className="ep-card-prompt">{item.prompt.prompt}</div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="ep-card-details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {item.type === 'saq' && (
                      <>
                        <div className="ep-detail-section">
                          <div className="ep-detail-label">Parts</div>
                          <div className="ep-parts">
                            {item.prompt.parts.map((part, j) => (
                              <div key={j} className="ep-part">{part}</div>
                            ))}
                          </div>
                        </div>
                        <details className="ep-reveal">
                          <summary>Show Guidance</summary>
                          <p>{item.prompt.guidance}</p>
                        </details>
                      </>
                    )}

                    {item.type === 'leq' && (
                      <>
                        <div className="ep-detail-section">
                          <div className="ep-detail-label">Thesis Hint</div>
                          <p className="ep-thesis-hint">{item.prompt.thesis_hint}</p>
                        </div>
                        <div className="ep-detail-section">
                          <div className="ep-detail-label">Evidence to Consider</div>
                          <ul className="ep-evidence-list">
                            {item.prompt.evidence_suggestions.map((ev, j) => (
                              <li key={j}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                        <details className="ep-reveal">
                          <summary>Rubric Tips</summary>
                          <p>{item.prompt.rubric_tips}</p>
                        </details>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
