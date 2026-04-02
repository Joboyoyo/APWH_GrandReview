import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './Quiz.css';

const SPICET_META = {
  social: { label: 'Social', color: '#E74C3C' },
  political: { label: 'Political', color: '#3498DB' },
  interactions: { label: 'Interactions', color: '#2ECC71' },
  cultural: { label: 'Cultural', color: '#9B59B6' },
  economic: { label: 'Economic', color: '#F39C12' },
  technology: { label: 'Technology', color: '#1ABC9C' },
};

const LETTERS = ['A', 'B', 'C', 'D'];

// localStorage helpers for score persistence
export function getScores() {
  try {
    return JSON.parse(localStorage.getItem('apwh-quiz-scores') || '{}');
  } catch { return {}; }
}

export function saveScore(eventId, score, total) {
  const scores = getScores();
  const prev = scores[eventId];
  scores[eventId] = {
    score,
    total,
    best: Math.max(score, prev?.best || 0),
    lastAttempt: Date.now(),
    attempts: (prev?.attempts || 0) + 1,
  };
  localStorage.setItem('apwh-quiz-scores', JSON.stringify(scores));
}

export default function Quiz({ questions, title, eventId, onClose, fullPage = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!questions || questions.length === 0) return null;

  const question = questions[currentIndex];
  const isCorrect = selectedAnswer === question.correct;
  const theme = SPICET_META[question.theme];

  const handleSelect = (index) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
    setShowFeedback(true);
    if (index === question.correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      setFinished(true);
    }
  };

  // Save score when finished
  useEffect(() => {
    if (finished && eventId) {
      saveScore(eventId, score, questions.length);
    }
  }, [finished]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setFinished(false);
  };

  const content = (
    <motion.div
      className={fullPage ? 'quiz-full-page' : 'quiz-modal'}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {/* Header */}
      <div className="quiz-header">
        <div>
          <div className="quiz-title">Review: {title}</div>
          {!finished && (
            <div className="quiz-progress">
              Question {currentIndex + 1} of {questions.length}
            </div>
          )}
        </div>
        <button className="quiz-close" onClick={onClose}>&#x2715;</button>
      </div>

      {/* Progress bar */}
      {!finished && (
        <div className="quiz-progress-bar">
          <div
            className="quiz-progress-fill"
            style={{ width: `${((currentIndex + (showFeedback ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      )}

      {finished ? (
        /* Score screen */
        <div className="quiz-score">
          <div className="score-number">{score}/{questions.length}</div>
          <div className="score-pct">{Math.round((score / questions.length) * 100)}%</div>
          <div className="score-label">
            {score === questions.length
              ? 'Perfect score! You really know this material.'
              : score >= questions.length * 0.7
                ? 'Great work! Review the ones you missed.'
                : 'Keep studying — you\'ll get there!'}
          </div>
          <div className="score-actions">
            <button className="quiz-restart" onClick={handleRestart}>Try Again</button>
            <button className="quiz-next" onClick={onClose}>Done</button>
          </div>
        </div>
      ) : (
        <>
          {/* Question body */}
          <div className="quiz-body">
            {theme && (
              <div className="quiz-theme-badge">
                <span className={`spicet-badge ${question.theme}`}>
                  {theme.label}
                </span>
              </div>
            )}

            <div className="quiz-question">{question.question}</div>

            <div className="quiz-choices">
              {question.choices.map((choice, index) => {
                let className = 'quiz-choice';
                if (showFeedback) {
                  if (index === question.correct) className += ' correct';
                  else if (index === selectedAnswer) className += ' incorrect';
                } else if (index === selectedAnswer) {
                  className += ' selected';
                }

                return (
                  <button
                    key={index}
                    className={className}
                    onClick={() => handleSelect(index)}
                    disabled={showFeedback}
                  >
                    <span className="choice-letter">{LETTERS[index]}.</span>
                    <span>{choice}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <motion.div
                className={`quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="feedback-header">
                  {isCorrect ? 'Correct!' : `Incorrect — The answer is ${LETTERS[question.correct]}.`}
                </div>
                <div>{question.explanation}</div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {showFeedback && (
            <div className="quiz-footer">
              <button className="quiz-next" onClick={handleNext}>
                {currentIndex < questions.length - 1 ? 'Next Question →' : 'See Results'}
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );

  if (fullPage) {
    return <div className="quiz-page-wrapper">{content}</div>;
  }

  return (
    <div className="quiz-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {content}
    </div>
  );
}
