import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Tutorial.css';

const STEPS = [
  {
    title: 'Welcome to AP World History Grand Review',
    desc: 'An interactive timeline-based study tool for the AP World History exam. Let\'s show you how it works.',
    icon: '🌍',
  },
  {
    title: 'Zoom & Pan the Timeline',
    desc: 'Scroll to zoom in and out. Click and drag to pan. The timeline reveals more detail as you zoom in — eras break into individual events.',
    icon: '🔍',
  },
  {
    title: 'Explore Events',
    desc: 'Double-click any era or event to zoom in. When zoomed into an event, you\'ll see SPICE-T analysis, primary sources, key terms, and quizzes.',
    icon: '📖',
  },
  {
    title: 'Search & Filter',
    desc: 'Use the search bar to find any event instantly. Click the S, P, I, C, E, T theme buttons to filter events by category.',
    icon: '🔎',
  },
  {
    title: 'Keyboard Shortcuts',
    desc: 'Use ← → arrow keys to navigate between events. Press Enter to zoom into the selected event. Press Escape to zoom back out.',
    icon: '⌨️',
  },
  {
    title: 'Compare & Review',
    desc: 'Use the Compare tab to see side-by-side SPICE-T comparisons. Take quizzes in the Quizzes tab. Track your progress in the Progress tab.',
    icon: '📊',
  },
  {
    title: 'You\'re Ready!',
    desc: 'Start exploring the timeline. Good luck on the AP exam!',
    icon: '🎓',
  },
];

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="tutorial-overlay">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="tutorial-card"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="tutorial-icon">{current.icon}</div>
          <h2 className="tutorial-title">{current.title}</h2>
          <p className="tutorial-desc">{current.desc}</p>

          <div className="tutorial-dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`tutorial-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
            ))}
          </div>

          <div className="tutorial-actions">
            <button className="tutorial-skip" onClick={onClose}>
              Skip
            </button>
            <button className="tutorial-next" onClick={() => isLast ? onClose() : setStep(s => s + 1)}>
              {isLast ? 'Get Started' : 'Next →'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
