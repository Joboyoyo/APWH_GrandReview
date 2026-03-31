import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Quiz, { getScores } from './Quiz';
import './QuizHub.css';

export default function QuizHub({ data }) {
  const [activeQuiz, setActiveQuiz] = useState(null); // { questions, title, eventId }
  const [expandedEra, setExpandedEra] = useState(null);
  const [filterTheme, setFilterTheme] = useState(null);
  const [scores, setScores] = useState(() => getScores());

  const themes = [
    { key: 'social', label: 'Social', color: '#E74C3C' },
    { key: 'political', label: 'Political', color: '#3498DB' },
    { key: 'interactions', label: 'Interactions', color: '#2ECC71' },
    { key: 'cultural', label: 'Cultural', color: '#9B59B6' },
    { key: 'economic', label: 'Economic', color: '#F39C12' },
    { key: 'technology', label: 'Technology', color: '#1ABC9C' },
  ];

  // Compute stats
  const stats = useMemo(() => {
    let totalQuestions = 0;
    let totalEvents = 0;
    let completedEvents = 0;
    for (const era of data.eras) {
      for (const event of era.events) {
        if (event.quiz?.length > 0) {
          totalEvents++;
          totalQuestions += event.quiz.length;
          if (scores[event.id]) completedEvents++;
        }
      }
    }
    return { totalQuestions, totalEvents, completedEvents };
  }, [data, scores]);

  // Combine all questions from an era
  const startEraReview = (era) => {
    const allQuestions = [];
    for (const event of era.events) {
      if (event.quiz) allQuestions.push(...event.quiz);
    }
    if (allQuestions.length > 0) {
      setActiveQuiz({
        questions: allQuestions,
        title: era.title,
        eventId: `era-review-${era.id}`,
      });
    }
  };

  // Start single event quiz
  const startEventQuiz = (event) => {
    if (event.quiz?.length > 0) {
      setActiveQuiz({
        questions: event.quiz,
        title: event.title,
        eventId: event.id,
      });
    }
  };

  const handleCloseQuiz = () => {
    setActiveQuiz(null);
    setScores(getScores()); // refresh scores
  };

  if (activeQuiz) {
    return (
      <Quiz
        questions={activeQuiz.questions}
        title={activeQuiz.title}
        eventId={activeQuiz.eventId}
        onClose={handleCloseQuiz}
        fullPage
      />
    );
  }

  return (
    <div className="quizhub">
      {/* Stats header */}
      <div className="quizhub-stats">
        <div className="stat-card">
          <div className="stat-number">{stats.totalQuestions}</div>
          <div className="stat-label">Questions</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalEvents}</div>
          <div className="stat-label">Topics</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.completedEvents}</div>
          <div className="stat-label">Reviewed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {stats.totalEvents > 0 ? Math.round((stats.completedEvents / stats.totalEvents) * 100) : 0}%
          </div>
          <div className="stat-label">Progress</div>
        </div>
      </div>

      {/* Theme filter */}
      <div className="quizhub-filters">
        <button
          className={`filter-chip ${!filterTheme ? 'active' : ''}`}
          onClick={() => setFilterTheme(null)}
        >
          All Themes
        </button>
        {themes.map(t => (
          <button
            key={t.key}
            className={`filter-chip ${filterTheme === t.key ? 'active' : ''}`}
            style={filterTheme === t.key ? { borderColor: t.color, color: t.color } : {}}
            onClick={() => setFilterTheme(filterTheme === t.key ? null : t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Era sections */}
      <div className="quizhub-eras">
        {data.eras.map((era) => {
          const eraEvents = era.events.filter(e => {
            if (!e.quiz || e.quiz.length === 0) return false;
            if (filterTheme) {
              return e.quiz.some(q => q.theme === filterTheme);
            }
            return true;
          });

          if (eraEvents.length === 0) return null;
          const isExpanded = expandedEra === era.id || expandedEra === null;
          const totalEraQ = eraEvents.reduce((sum, e) => sum + (e.quiz?.length || 0), 0);

          return (
            <div key={era.id} className="era-section">
              <div
                className="era-section-header"
                onClick={() => setExpandedEra(expandedEra === era.id ? null : era.id)}
              >
                <div className="era-section-color" style={{ background: era.color }} />
                <div className="era-section-info">
                  <h3 className="era-section-title">{era.title}</h3>
                  <span className="era-section-dates">c. {era.startYear}–{era.endYear}</span>
                </div>
                <div className="era-section-meta">
                  <span className="era-q-count">{totalEraQ} questions</span>
                  <button
                    className="era-review-btn"
                    onClick={(e) => { e.stopPropagation(); startEraReview({ ...era, events: eraEvents }); }}
                  >
                    Review All
                  </button>
                  <span className={`era-chevron ${isExpanded ? 'open' : ''}`}>&#9662;</span>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="era-events-list"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {eraEvents.map((event) => {
                      const eventScore = scores[event.id];
                      const questionCount = event.quiz.length;
                      const filteredQuestions = filterTheme
                        ? event.quiz.filter(q => q.theme === filterTheme)
                        : event.quiz;

                      return (
                        <div
                          key={event.id}
                          className="event-quiz-card"
                          onClick={() => startEventQuiz({ ...event, quiz: filteredQuestions })}
                        >
                          <div className="eqc-color" style={{ background: event.color }} />

                          {event.hoverImage && (
                            <div className="eqc-image">
                              <img src={event.hoverImage} alt={event.title} />
                            </div>
                          )}

                          <div className="eqc-info">
                            <div className="eqc-title">{event.title}</div>
                            <div className="eqc-meta">
                              <span className="eqc-dates">{event.startYear}–{event.endYear}</span>
                              <span className="eqc-qcount">{filteredQuestions.length} questions</span>
                              {event.quiz.map(q => q.theme).filter((v, i, a) => a.indexOf(v) === i).map(t => (
                                <span key={t} className={`spicet-badge ${t}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                                  {t.charAt(0).toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="eqc-score-area">
                            {eventScore ? (
                              <div className="eqc-score">
                                <div className="eqc-score-ring" style={{
                                  '--pct': `${(eventScore.best / eventScore.total) * 100}%`,
                                  '--ring-color': eventScore.best === eventScore.total ? '#2ECC71'
                                    : eventScore.best >= eventScore.total * 0.7 ? '#F39C12' : '#E74C3C',
                                }}>
                                  <span>{eventScore.best}/{eventScore.total}</span>
                                </div>
                                <div className="eqc-attempts">{eventScore.attempts}x</div>
                              </div>
                            ) : (
                              <div className="eqc-start">Start</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
