import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './EventPanel.css';

const SPICET_META = {
  social: { label: 'Social', color: '#E74C3C' },
  political: { label: 'Political', color: '#3498DB' },
  interactions: { label: 'Interactions', color: '#2ECC71' },
  cultural: { label: 'Cultural', color: '#9B59B6' },
  economic: { label: 'Economic', color: '#F39C12' },
  technology: { label: 'Technology', color: '#1ABC9C' },
};

export default function EventPanel({ item, parentTitle, onClose, onStartQuiz }) {
  const [expandedTheme, setExpandedTheme] = useState(null);

  if (!item) return null;

  const hasQuiz = item.quiz && item.quiz.length > 0;

  return (
    <div className="event-panel">
      {/* Header */}
      <div className="panel-header">
        {parentTitle && (
          <div className="panel-breadcrumb">{parentTitle}</div>
        )}
        <div className="panel-title">{item.title}</div>
        <div className="panel-dates">
          c. {item.startYear} – {item.endYear}
        </div>
        <button className="panel-close" onClick={onClose}>
          &#x2715;
        </button>
      </div>

      {/* Summary */}
      <div className="panel-section">
        <div className="section-title">Overview</div>
        <p className="panel-summary">{item.summary}</p>
      </div>

      {/* SPICE-T Themes */}
      <div className="panel-section">
        <div className="section-title">SPICE-T Themes</div>
        <div className="spicet-grid">
          {Object.entries(item.spiceT).map(([key, content]) => {
            const meta = SPICET_META[key];
            const isOpen = expandedTheme === key;
            return (
              <div
                key={key}
                className={`spicet-item ${isOpen ? 'expanded' : ''}`}
                style={{ background: isOpen ? `${meta.color}10` : 'transparent' }}
                onClick={() => setExpandedTheme(isOpen ? null : key)}
              >
                <div className="spicet-item-header">
                  <div className="spicet-dot" style={{ background: meta.color }} />
                  <span className="spicet-label">{meta.label}</span>
                  <span className={`spicet-toggle ${isOpen ? 'open' : ''}`}>&#9662;</span>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      className="spicet-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {content}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Terms */}
      {item.keyTerms && (
        <div className="panel-section">
          <div className="section-title">Key Terms</div>
          <div className="key-terms">
            {item.keyTerms.map((term) => (
              <span key={term} className="key-term">{term}</span>
            ))}
          </div>
        </div>
      )}

      {/* Review Button */}
      {hasQuiz && (
        <div className="panel-section">
          <button className="review-button" onClick={() => onStartQuiz(item)}>
            <span>&#9881;</span>
            Review This {item.events ? 'Period' : 'Event'} — {item.quiz.length} Questions
          </button>
        </div>
      )}
    </div>
  );
}
