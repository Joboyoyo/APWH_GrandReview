import { useState, useMemo } from 'react';
import Timeline from './components/Timeline';
import Quiz from './components/Quiz';
import timelineData from './data/timelineData.json';
import { eraImages, eventImages } from './data/images';
import './App.css';

function App() {
  const [quizData, setQuizData] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');

  const enrichedData = useMemo(() => ({
    eras: timelineData.eras.map((era) => ({
      ...era,
      image: eraImages[era.id] || null,
      events: era.events.map((event) => ({
        ...event,
        image: eventImages[event.id] || null,
      })),
    })),
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
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            AP World History <span>Grand Review</span>
          </h1>
          <div className="header-subtitle">Interactive Timeline Study Tool</div>
        </div>
      </header>

      <div className="app-body">
        <div className="timeline-panel">
          <Timeline
            data={enrichedData}
            onStartQuiz={handleStartQuiz}
          />
        </div>
      </div>

      {quizData && (
        <Quiz
          questions={quizData}
          title={quizTitle}
          onClose={handleCloseQuiz}
        />
      )}
    </div>
  );
}

export default App;
