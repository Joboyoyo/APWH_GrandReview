import { useState, useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Timeline from './components/Timeline';
import QuizHub from './components/QuizHub';
import Quiz from './components/Quiz';
import timelineData from './data/timelineData.json';
import { eraImages, eventImages, eventHoverImages } from './data/images';
import './App.css';

function App() {
  const [quizData, setQuizData] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
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
    <BrowserRouter basename="/APWH_GrandReview/">
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
                Timeline
              </NavLink>
              <NavLink to="/quizzes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Quizzes
              </NavLink>
            </nav>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? '\u2600' : '\u263E'}
            </button>
          </div>
        </header>

        <div className="app-body">
          <Routes>
            <Route path="/" element={
              <div className="timeline-panel">
                <Timeline data={enrichedData} onStartQuiz={handleStartQuiz} />
              </div>
            } />
            <Route path="/quizzes" element={
              <QuizHub data={enrichedData} />
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
      </div>
    </BrowserRouter>
  );
}

export default App;
