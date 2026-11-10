import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Icon } from './components/Icon'
import { StudentBar } from './components/StudentBar'
import { ClassListPage } from './pages/ClassListPage'
import { CreateClassPage } from './pages/CreateClassPage'
import { HoldPage } from './pages/HoldPage'
import { MyApplicationsPage } from './pages/MyApplicationsPage'
import { useStudent } from './student/studentContext'

/** The current page's name for the breadcrumb in the top bar. */
function pageName(pathname: string): string {
  if (pathname === '/classes') return 'ক্লাস তালিকা'
  if (pathname === '/classes/new') return 'স্কুল অ্যাডমিন / নতুন ক্লাস'
  if (pathname === '/my-applications') return 'আমার আবেদন'
  if (pathname.startsWith('/holds/')) return 'আবেদনের বিস্তারিত'
  return 'পাতা পাওয়া যায়নি'
}

function StudentCard() {
  const { studentId } = useStudent()
  return (
    <div className="workspace-card">
      <strong>শিক্ষার্থী</strong>
      {studentId ? <span className="mono">{studentId}</span> : <span>নম্বর দেওয়া হয়নি</span>}
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/classes" className="brand">
          <span className="brand-mark">
            <Icon>
              <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
              <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
            </Icon>
          </span>
          স্কুল ভর্তি
        </Link>

        <StudentCard />

        <nav className="side-nav" aria-label="প্রধান মেনু">
          <p className="side-nav-label">ভর্তি</p>
          <NavLink to="/classes" end>
            <Icon>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </Icon>
            ক্লাস তালিকা
          </NavLink>
          <NavLink to="/my-applications">
            <Icon>
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </Icon>
            আমার আবেদন
          </NavLink>
          <p className="side-nav-label side-nav-label-admin">স্কুল অ্যাডমিন</p>
          <NavLink to="/classes/new" className="side-nav-admin">
            <Icon>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </Icon>
            নতুন ক্লাস
          </NavLink>
        </nav>

        <p className="sidebar-foot">
          <strong>ভর্তি ডেস্ক</strong>
          <span>সিট হোল্ড, ফি ও আবেদন</span>
        </p>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <p className="breadcrumb">
            স্কুল ভর্তি / <span>{pageName(pathname)}</span>
          </p>
          <StudentBar />
        </header>

        <main className="content">
          <ErrorBoundary key={pathname}>
            <Routes>
              <Route path="/" element={<Navigate to="/classes" replace />} />
              <Route path="/classes" element={<ClassListPage />} />
              <Route path="/classes/new" element={<CreateClassPage />} />
              <Route path="/holds/:holdId" element={<HoldPage />} />
              <Route path="/my-applications" element={<MyApplicationsPage />} />
              <Route
                path="*"
                element={
                  <section>
                    <h1>পাতাটি পাওয়া যায়নি</h1>
                    <Link to="/classes">ক্লাস তালিকায় ফিরে যান</Link>
                  </section>
                }
              />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
