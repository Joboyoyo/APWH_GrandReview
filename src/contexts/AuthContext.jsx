import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { username, token }
  const [loading, setLoading] = useState(true);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [scores, setScores] = useState(() => {
    try { return JSON.parse(localStorage.getItem('apwh-quiz-scores') || '{}'); } catch { return {}; }
  });

  // Check server availability and validate stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem('apwh-auth');

    // Try to reach the server
    fetch(`${API_BASE}/me`, {
      headers: stored ? { Authorization: `Bearer ${JSON.parse(stored).token}` } : {},
    })
      .then(r => {
        setServerAvailable(true);
        if (r.ok && stored) {
          const { username, token } = JSON.parse(stored);
          setUser({ username, token });
          // Fetch cloud scores
          return fetch(`${API_BASE}/scores`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
              if (data.scores) {
                setScores(data.scores);
                localStorage.setItem('apwh-quiz-scores', JSON.stringify(data.scores));
              }
            });
        } else if (stored && !r.ok) {
          localStorage.removeItem('apwh-auth');
        }
      })
      .catch(() => {
        // Server not available — that's fine, run in local-only mode
        setServerAvailable(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser({ username: data.username, token: data.token });
    localStorage.setItem('apwh-auth', JSON.stringify({ username: data.username, token: data.token }));

    // Fetch cloud scores after login
    try {
      const scoresRes = await fetch(`${API_BASE}/scores`, { headers: { Authorization: `Bearer ${data.token}` } });
      const scoresData = await scoresRes.json();
      if (scoresData.scores) {
        // Merge cloud scores with local scores (cloud wins for conflicts)
        const local = scores;
        const merged = { ...local, ...scoresData.scores };
        setScores(merged);
        localStorage.setItem('apwh-quiz-scores', JSON.stringify(merged));

        // Push merged scores back if local had extra
        if (Object.keys(local).length > 0) {
          await fetch(`${API_BASE}/scores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
            body: JSON.stringify({ scores: merged }),
          });
        }
      }
    } catch { /* server issue, continue with local */ }

    return data;
  }, [scores]);

  const register = useCallback(async (username, password) => {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    setUser({ username: data.username, token: data.token });
    localStorage.setItem('apwh-auth', JSON.stringify({ username: data.username, token: data.token }));

    // Upload existing local scores to new account
    if (Object.keys(scores).length > 0) {
      try {
        await fetch(`${API_BASE}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
          body: JSON.stringify({ scores }),
        });
      } catch { /* ok */ }
    }

    return data;
  }, [scores]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('apwh-auth');
    // Keep local scores as fallback
  }, []);

  const saveScore = useCallback(async (eventId, score, total) => {
    const prev = scores[eventId];
    const newEntry = {
      score,
      total,
      best: Math.max(score, prev?.best || 0),
      lastAttempt: Date.now(),
      attempts: (prev?.attempts || 0) + 1,
    };

    const updated = { ...scores, [eventId]: newEntry };
    setScores(updated);
    localStorage.setItem('apwh-quiz-scores', JSON.stringify(updated));

    // Sync to cloud if logged in
    if (user?.token) {
      try {
        await fetch(`${API_BASE}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ scores: { [eventId]: newEntry } }),
        });
      } catch { /* offline, local is saved */ }
    }
  }, [scores, user]);

  return (
    <AuthContext.Provider value={{ user, loading, scores, login, register, logout, saveScore, serverAvailable }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
