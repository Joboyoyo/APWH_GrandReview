import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Timeline from './components/Timeline';
import QuizHub from './components/QuizHub';
import ProgressDashboard from './components/ProgressDashboard';
import ComparisonTool from './components/ComparisonTool';
import Quiz from './components/Quiz';
import Tutorial from './components/Tutorial';
import LandingPage from './components/LandingPage';
import EssayPractice from './components/EssayPractice';
import timelineData from './data/timelineData.json';
import { eraImages, eventImages, eventHoverImages } from './data/images';
import './App.css';

function App() {
  const [quizData, setQuizData] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('apwh-tutorial-done'));
  const [theme, setTheme] = useState(() => localStorage.getItem('apwh-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('apwh-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const enrichedData = useMemo(() => ({
    eras: timelineData.eras.map((era) => ({
      ...era,
      image: eraImages[era.id] || null,
      events: era.events.map((event) => ({
        ...event,
        image: eventImages[event.id] || null,
        hoverImage: eventHoverImages[event.id] || null,
      })),
    })),
    connections: timelineData.connections || [],
  }), []);

  const handleStartQuiz = (item) => {
    setQuizData(item.quiz);
    setQuizTitle(item.title);
  };

  const handleCloseQuiz = () => {
    setQuizData(null);
    setQuizTitle('');
  };

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div>
            <h1>
              AP World History <span>Grand Review</span>
            </h1>
            <div className="header-subtitle">Interactive Timeline Study Tool</div>
          </div>
          <div className="header-controls">
            <nav className="app-nav">
              <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Home
              </NavLink>
              <NavLink to="/timeline" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Timeline
              </NavLink>
              <NavLink to="/quizzes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Quizzes
              </NavLink>
              <NavLink to="/compare" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Compare
              </NavLink>
              <NavLink to="/essays" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Essays
              </NavLink>
              <NavLink to="/progress" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Progress
              </NavLink>
            </nav>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? '\u2600' : '\u263E'}
            </button>
          </div>
        </header>

        <div className="app-body">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/timeline" element={
              <div className="timeline-panel">
                <Timeline data={enrichedData} onStartQuiz={handleStartQuiz} />
              </div>
            } />
            <Route path="/quizzes" element={
              <QuizHub data={enrichedData} />
            } />
            <Route path="/compare" element={
              <ComparisonTool data={enrichedData} />
            } />
            <Route path="/essays" element={
              <EssayPractice data={enrichedData} />
            } />
            <Route path="/progress" element={
              <ProgressDashboard data={enrichedData} />
            } />
          </Routes>
        </div>

        {quizData && (
          <Quiz
            questions={quizData}
            title={quizTitle}
            onClose={handleCloseQuiz}
          />
        )}
      {showTutorial && (
        <Tutorial onClose={() => { setShowTutorial(false); localStorage.setItem('apwh-tutorial-done', '1'); }} />
      )}
      </div>
    </BrowserRouter>
  );
}

export default App;
