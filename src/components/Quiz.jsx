import { useState } from 'react';
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

export default function Quiz({ questions, title, onClose }) {
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

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setFinished(false);
  };

  return (
    <div className="quiz-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="quiz-modal"
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

        {finished ? (
          /* Score screen */
          <div className="quiz-score">
            <div className="score-number">{score}/{questions.length}</div>
            <div className="score-label">
              {score === questions.length
                ? 'Perfect score! You really know this material.'
                : score >= questions.length * 0.7
                  ? 'Great work! Review the ones you missed.'
                  : 'Keep studying — you\'ll get there!'}
            </div>
            <button className="quiz-restart" onClick={handleRestart}>Try Again</button>
          </div>
        ) : (
          <>
            {/* Question body */}
            <div className="quiz-body">
              {theme && (
                <div className="quiz-theme-badge">
                  <span
                    className={`spicet-badge ${question.theme}`}
                  >
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
    </div>
  );
}
