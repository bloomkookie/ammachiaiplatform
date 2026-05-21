import React, { useEffect, useMemo, useState } from 'react';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Market from './pages/Market.jsx';
import Weather from './pages/Weather.jsx';
import Detect from './pages/Detect.jsx';
import Chat from './pages/Chat.jsx';
import Farms from './pages/Farms.jsx';
import Activities from './pages/Activities.jsx';
import Reminders from './pages/Reminders.jsx';
import FarmerProfile from './pages/FarmerProfile.jsx';
import Officers from './pages/Officers.jsx';
import Feedback from './pages/Feedback.jsx';
import MobileNav from './components/MobileNav.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';

function getRoute() {
  const h = window.location.hash.replace('#', '');
  if (h.startsWith('/login')) return '/login';
  if (h.startsWith('/signup')) return '/signup';
  if (h.startsWith('/dashboard')) return '/dashboard';
  if (h.startsWith('/chat')) return '/chat';
  if (h.startsWith('/market')) return '/market';
  if (h.startsWith('/weather')) return '/weather';
  if (h.startsWith('/detect')) return '/detect';
  if (h.startsWith('/profile')) return '/profile';
  if (h.startsWith('/farms')) return '/farms';
  if (h.startsWith('/activities')) return '/activities';
  if (h.startsWith('/reminders')) return '/reminders';
  if (h.startsWith('/farmers')) return '/farmers';
  if (h.startsWith('/officers')) return '/officers';
  if (h.startsWith('/feedback')) return '/feedback';
  return '/';
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const isAuthed = useMemo(() => {
    try { return Boolean(JSON.parse(localStorage.getItem('ammachi_session') || 'null')); } catch { return false; }
  }, [route]);

  // Authentication removed: allow access to all routes without redirects

  let page = null;
  switch (route) {
    case '/login':
      page = <Login />; break;
    case '/signup':
      page = <SignUp />; break;
    case '/dashboard':
      page = <Dashboard />; break;
    case '/market':
      page = <Market />; break;
    case '/weather':
      page = <Weather />; break;
    case '/detect':
      page = <Detect />; break;
    case '/chat':
      page = <Chat />; break;
    case '/profile':
      page = <Profile />; break;
    case '/farms':
      page = <Farms />; break;
    case '/activities':
      page = <Activities />; break;
    case '/reminders':
      page = <Reminders />; break;
    case '/farmers':
      page = <FarmerProfile />; break;
    case '/officers':
      page = <Officers />; break;
    case '/feedback':
      page = <Feedback />; break;
    default:
      page = <Landing />; break;
  }

  return (
    <LanguageProvider>
      {page}
      <MobileNav />
    </LanguageProvider>
  );
}
