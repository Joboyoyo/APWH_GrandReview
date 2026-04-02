import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getScores } from './Quiz';
import './ProgressDashboard.css';

const SPICET = [
  { key: 'social', label: 'Social', color: '#E74C3C', icon: 'S' },
  { key: 'political', label: 'Political', color: '#3498DB', icon: 'P' },
  { key: 'interactions', label: 'Interactions', color: '#2ECC71', icon: 'I' },
  { key: 'cultural', label: 'Cultural', color: '#9B59B6', icon: 'C' },
  { key: 'economic', label: 'Economic', color: '#F39C12', icon: 'E' },
  { key: 'technology', label: 'Technology', color: '#1ABC9C', icon: 'T' },
];

export default function ProgressDashboard({ data }) {
  const navigate = useNavigate();
  const scores = getScores();

  const analysis = useMemo(() => {
    let totalQuestions = 0;
    let totalEvents = 0;
    let completedEvents = 0;
    let totalCorrect = 0;
    let totalAttempted = 0;
    let totalAttempts = 0;

    // Per-theme stats
    const themeStats = {};
    SPICET.forEach(t => { themeStats[t.key] = { total: 0, correct: 0, attempted: 0 }; });

    // Per-era stats
    const eraStats = [];

    // Recent activity & suggestions
    const recentActivity = [];
    const lowScoreEvents = [];
    const unattemptedEvents = [];

    // All events flat
    const allEvents = [];

    for (const era of data.eras) {
      let eraTotal = 0;
      let eraCompleted = 0;
      let eraCorrect = 0;
      let eraAttempted = 0;

      for (const event of era.events) {
        allEvents.push({ ...event, eraTitle: era.title, eraColor: era.color });

        if (event.quiz?.length > 0) {
          totalEvents++;
          totalQuestions += event.quiz.length;
          eraTotal += event.quiz.length;

          // Count per-theme questions
          for (const q of event.quiz) {
            if (q.theme && themeStats[q.theme]) {
              themeStats[q.theme].total++;
            }
          }

          const eventScore = scores[event.id];
          if (eventScore) {
            completedEvents++;
            eraCompleted++;
            totalCorrect += eventScore.best;
            totalAttempted += eventScore.total;
            eraCorrect += eventScore.best;
            eraAttempted += eventScore.total;
            totalAttempts += eventScore.attempts;

            // Per-theme scoring (approximate: distribute best score proportionally by theme)
            const themeCounts = {};
            for (const q of event.quiz) {
              if (q.theme) themeCounts[q.theme] = (themeCounts[q.theme] || 0) + 1;
            }
            for (const [theme, count] of Object.entries(themeCounts)) {
              if (themeStats[theme]) {
                const pct = eventScore.best / eventScore.total;
                themeStats[theme].correct += Math.round(count * pct);
                themeStats[theme].attempted += count;
              }
            }

            // Recent activity
            recentActivity.push({
              eventId: event.id,
              title: event.title,
              eraTitle: era.title,
              eraColor: era.color,
              color: event.color,
              score: eventScore.best,
              total: eventScore.total,
              attempts: eventScore.attempts,
              lastAttempt: eventScore.lastAttempt,
              hoverImage: event.hoverImage,
            });

            // Low scores
            if (eventScore.best / eventScore.total < 0.7) {
              lowScoreEvents.push({
                ...event,
                eraTitle: era.title,
                eraColor: era.color,
                pct: Math.round((eventScore.best / eventScore.total) * 100),
              });
            }
          } else {
            unattemptedEvents.push({
              ...event,
              eraTitle: era.title,
              eraColor: era.color,
            });
          }
        }
      }

      eraStats.push({
        id: era.id,
        title: era.title,
        color: era.color,
        startYear: era.startYear,
        endYear: era.endYear,
        total: eraTotal,
        completed: eraCompleted,
        correct: eraCorrect,
        attempted: eraAttempted,
      });
    }

    // Sort recent by lastAttempt descending
    recentActivity.sort((a, b) => b.lastAttempt - a.lastAttempt);

    // Find weakest theme
    let weakestTheme = null;
    let weakestPct = 1;
    for (const t of SPICET) {
      const s = themeStats[t.key];
      if (s.attempted > 0) {
        const pct = s.correct / s.attempted;
        if (pct < weakestPct) { weakestPct = pct; weakestTheme = t.key; }
      }
    }

    // Unique study days
    const studyDays = new Set();
    for (const entry of recentActivity) {
      const d = new Date(entry.lastAttempt);
      studyDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }

    return {
      totalQuestions, totalEvents, completedEvents,
      totalCorrect, totalAttempted, totalAttempts,
      accuracy: totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0,
      completionPct: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0,
      themeStats, weakestTheme,
      eraStats,
      recentActivity: recentActivity.slice(0, 10),
      lowScoreEvents, unattemptedEvents,
      studyDays: studyDays.size,
    };
  }, [data, scores]);

  const formatDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="progress-dashboard">
      {/* Overall stats */}
      <div className="pd-stats-row">
        <motion.div className="pd-stat" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0 }}>
          <div className="pd-stat-number">{analysis.completedEvents}<span className="pd-stat-of">/{analysis.totalEvents}</span></div>
          <div className="pd-stat-label">Topics Reviewed</div>
        </motion.div>
        <motion.div className="pd-stat" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
          <div className="pd-stat-number">{analysis.totalAttempted}<span className="pd-stat-of">/{analysis.totalQuestions}</span></div>
          <div className="pd-stat-label">Questions Answered</div>
        </motion.div>
        <motion.div className="pd-stat" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="pd-stat-number" style={{ color: analysis.accuracy >= 70 ? '#2ECC71' : analysis.accuracy >= 40 ? '#F39C12' : '#E74C3C' }}>{analysis.accuracy}%</div>
          <div className="pd-stat-label">Accuracy</div>
        </motion.div>
        <motion.div className="pd-stat" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <div className="pd-stat-number">{analysis.studyDays}</div>
          <div className="pd-stat-label">Study Days</div>
        </motion.div>
      </div>

      <div className="pd-grid">
        {/* Left column */}
        <div className="pd-col">
          {/* Big progress ring */}
          <motion.div className="pd-card pd-progress-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
            <h3 className="pd-card-title">Overall Completion</h3>
            <div className="pd-big-ring" style={{
              '--pct': `${analysis.completionPct}%`,
              '--ring-color': analysis.completionPct >= 80 ? '#2ECC71' : analysis.completionPct >= 40 ? '#F39C12' : '#3498DB',
            }}>
              <div className="pd-big-ring-inner">
                <span className="pd-big-ring-number">{analysis.completionPct}%</span>
                <span className="pd-big-ring-label">Complete</span>
              </div>
            </div>
            <div className="pd-big-ring-detail">
              {analysis.completedEvents} of {analysis.totalEvents} topics · {analysis.totalAttempts} total attempts
            </div>
          </motion.div>

          {/* SPICE-T Theme Breakdown */}
          <motion.div className="pd-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <h3 className="pd-card-title">SPICE-T Theme Strength</h3>
            <div className="pd-themes">
              {SPICET.map(theme => {
                const s = analysis.themeStats[theme.key];
                const pct = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
                const isWeakest = theme.key === analysis.weakestTheme;
                return (
                  <div key={theme.key} className={`pd-theme-row ${isWeakest ? 'weakest' : ''}`}>
                    <div className="pd-theme-label">
                      <span className="pd-theme-icon" style={{ background: theme.color + '25', color: theme.color }}>{theme.icon}</span>
                      <span className="pd-theme-name">{theme.label}</span>
                      {isWeakest && <span className="pd-weak-tag">Needs Review</span>}
                    </div>
                    <div className="pd-theme-bar-wrapper">
                      <motion.div
                        className="pd-theme-bar"
                        style={{ background: theme.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                      />
                    </div>
                    <span className="pd-theme-pct" style={{ color: pct > 0 ? theme.color : 'var(--text-muted)' }}>
                      {s.attempted > 0 ? `${pct}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="pd-col">
          {/* Era Progress */}
          <motion.div className="pd-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <h3 className="pd-card-title">Era Progress</h3>
            <div className="pd-eras">
              {analysis.eraStats.map(era => {
                const pct = era.total > 0 ? Math.round((era.completed / (era.total > 0 ? data.eras.find(e => e.id === era.id)?.events.filter(ev => ev.quiz?.length > 0).length || 1 : 1)) * 100) : 0;
                const accPct = era.attempted > 0 ? Math.round((era.correct / era.attempted) * 100) : 0;
                return (
                  <div key={era.id} className="pd-era-row" onClick={() => navigate('/quizzes')}>
                    <div className="pd-era-color" style={{ background: era.color }} />
                    <div className="pd-era-info">
                      <div className="pd-era-title">{era.title}</div>
                      <div className="pd-era-dates">c. {era.startYear}–{era.endYear}</div>
                    </div>
                    <div className="pd-era-progress">
                      <div className="pd-era-bar-bg">
                        <motion.div
                          className="pd-era-bar-fill"
                          style={{ background: era.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                      <span className="pd-era-pct">{pct > 0 ? `${accPct}% acc` : 'Not started'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div className="pd-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <h3 className="pd-card-title">Recent Activity</h3>
            {analysis.recentActivity.length === 0 ? (
              <div className="pd-empty">
                <div className="pd-empty-icon">📝</div>
                <div className="pd-empty-text">No quizzes taken yet</div>
                <button className="pd-empty-btn" onClick={() => navigate('/quizzes')}>Start Studying</button>
              </div>
            ) : (
              <div className="pd-activity">
                {analysis.recentActivity.map((entry, i) => {
                  const pct = Math.round((entry.score / entry.total) * 100);
                  return (
                    <motion.div
                      key={entry.eventId + '-' + i}
                      className="pd-activity-row"
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                    >
                      {entry.hoverImage && (
                        <div className="pd-activity-img">
                          <img src={entry.hoverImage} alt="" />
                        </div>
                      )}
                      <div className="pd-activity-info">
                        <div className="pd-activity-title">{entry.title}</div>
                        <div className="pd-activity-meta">
                          <span style={{ color: entry.eraColor }}>{entry.eraTitle}</span>
                          <span>{formatDate(entry.lastAttempt)}</span>
                        </div>
                      </div>
                      <div className="pd-activity-score" style={{
                        color: pct >= 80 ? '#2ECC71' : pct >= 60 ? '#F39C12' : '#E74C3C'
                      }}>
                        {entry.score}/{entry.total}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Suggested Review */}
          {(analysis.lowScoreEvents.length > 0 || analysis.unattemptedEvents.length > 0) && (
            <motion.div className="pd-card" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <h3 className="pd-card-title">Suggested Review</h3>
              <div className="pd-suggestions">
                {analysis.lowScoreEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="pd-suggest-row" onClick={() => navigate('/quizzes')}>
                    <span className="pd-suggest-color" style={{ background: event.color }} />
                    <span className="pd-suggest-title">{event.title}</span>
                    <span className="pd-suggest-reason" style={{ color: '#E74C3C' }}>{event.pct}% — retry</span>
                  </div>
                ))}
                {analysis.unattemptedEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="pd-suggest-row" onClick={() => navigate('/quizzes')}>
                    <span className="pd-suggest-color" style={{ background: event.color }} />
                    <span className="pd-suggest-title">{event.title}</span>
                    <span className="pd-suggest-reason">Not started</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
