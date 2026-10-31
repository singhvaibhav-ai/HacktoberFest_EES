import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProblemList from './pages/ProblemList.jsx';
import ProblemPage from './pages/ProblemPage.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { AuthProvider } from './auth.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<ProblemList />} />
          <Route path="/problems/:slug" element={<ProblemPage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <span>Built at Hacktoberfest Hack Day 2026 · EES, NIT Jamshedpur</span>
        <a
          href="https://github.com/WhiteClueGaming/HacktoberFest_EES"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>
    </AuthProvider>
  );
}
