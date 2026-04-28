import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav-link nav-link--active' : 'nav-link';
}

export function AppLayout() {
  const { isAuthenticated, logout, session } = useAuth();

  return (
    <div className="app-shell">
      <div className="ambient ambient--left" />
      <div className="ambient ambient--right" />

      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-mark">K</span>
          <div>
            <strong>KnowledgeForKnowledge</strong>
            <span>Обмен знаниями</span>
          </div>
        </Link>

        <nav className="main-nav">
          <NavLink className={navLinkClassName} to="/">
            Обзор
          </NavLink>
          <NavLink className={navLinkClassName} to="/explore">
            Каталог
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink className={navLinkClassName} to="/my-listings">
                Мои карточки
              </NavLink>
              <NavLink className={navLinkClassName} to="/applications">
                Отклики
              </NavLink>
            </>
          ) : null}
          <NavLink className={navLinkClassName} to="/dashboard">
            Кабинет
          </NavLink>
          {session?.isAdmin ? (
            <NavLink className={navLinkClassName} to="/admin">
              Админ
            </NavLink>
          ) : null}
        </nav>

        <div className="topbar-actions">
          {isAuthenticated && session ? (
            <>
              <button className="button button--ghost" onClick={logout} type="button">
                Выйти
              </button>
            </>
          ) : (
            <Link className="button button--primary" to="/auth">
              Вход
            </Link>
          )}
        </div>
      </header>

      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}
