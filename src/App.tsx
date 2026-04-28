import { Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/AppLayout';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { MyListingsPage } from './pages/MyListingsPage';
import { ProfilePage } from './pages/ProfilePage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<HomePage />} path="/" />
        <Route element={<ExplorePage />} path="/explore" />
        <Route element={<MyListingsPage />} path="/my-listings" />
        <Route element={<ApplicationsPage />} path="/applications" />
        <Route element={<AdminPage />} path="/admin" />
        <Route element={<DashboardPage />} path="/dashboard" />
        <Route element={<AuthPage />} path="/auth" />
        <Route element={<ProfilePage />} path="/profile/:accountId" />
        <Route element={<HomePage />} path="*" />
      </Route>
    </Routes>
  );
}

export default App;
