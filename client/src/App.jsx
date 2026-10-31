import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProblemList from './pages/ProblemList.jsx';
import ProblemPage from './pages/ProblemPage.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { AuthProvider } from './auth.jsx';

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
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
