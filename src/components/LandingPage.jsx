import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './LandingPage.css';

const FEATURES = [
  { icon: '🗺️', title: 'Interactive Timeline', desc: 'Zoom from eras down to individual events. Pan across 800 years of world history.' },
  { icon: '📖', title: 'SPICE-T Analysis', desc: 'Every event broken down by Social, Political, Interactions, Cultural, Economic, and Technology themes.' },
  { icon: '📝', title: '156 Quiz Questions', desc: 'AP-style multiple choice with detailed explanations. Track your scores and progress.' },
  { icon: '⚖️', title: 'Compare & Contrast', desc: 'Side-by-side SPICE-T comparisons with essay prompts. Practice the skill the AP exam tests most.' },
  { icon: '📜', title: 'Primary Sources', desc: 'Key historical documents and excerpts for every event, with AP context.' },
  { icon: '📊', title: 'Progress Dashboard', desc: 'Visual breakdown of your strengths and weaknesses by theme and era.' },
];

const ERAS = [
  { label: 'Unit 1-2', title: '1200–1450', color: '#4A90D9', count: 11 },
  { label: 'Unit 3', title: '1450–1750', color: '#E67E22', count: 7 },
  { label: 'Unit 4', title: '1750–1900', color: '#9B59B6', count: 11 },
  { label: 'Unit 5-6', title: '1900–Present', color: '#E74C3C', count: 10 },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
          <div className="landing-badge">AP World History</div>
          <h1 className="landing-title">
            Grand <span>Review</span>
          </h1>
          <p className="landing-subtitle">
            The interactive timeline study tool for the AP World History exam.
            39 events. 156 questions. Every SPICE-T theme.
          </p>
          <div className="landing-cta-row">
            <button className="landing-cta" onClick={() => navigate('/')}>
              Explore the Timeline →
            </button>
            <button className="landing-cta-secondary" onClick={() => navigate('/quizzes')}>
              Start Quizzing
            </button>
          </div>
        </motion.div>
      </section>

      {/* Era overview */}
      <section className="landing-eras">
        {ERAS.map((era, i) => (
          <motion.div
            key={i}
            className="landing-era"
            style={{ borderColor: era.color }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.08 }}
          >
            <div className="landing-era-label" style={{ color: era.color }}>{era.label}</div>
            <div className="landing-era-title">{era.title}</div>
            <div className="landing-era-count">{era.count} events</div>
          </motion.div>
        ))}
      </section>

      {/* Features */}
      <section className="landing-features">
        <h2 className="landing-section-title">Everything You Need</h2>
        <div className="landing-feature-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              className="landing-feature"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <div className="landing-feature-icon">{f.icon}</div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-bottom">
        <h2 className="landing-bottom-title">Ready to Study?</h2>
        <div className="landing-cta-row">
          <button className="landing-cta" onClick={() => navigate('/')}>
            Open the Timeline
          </button>
          <button className="landing-cta-secondary" onClick={() => navigate('/compare')}>
            Compare Events
          </button>
        </div>
      </section>
    </div>
  );
}
