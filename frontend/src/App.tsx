import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { StudentBar } from './components/StudentBar'
import { ClassListPage } from './pages/ClassListPage'
import { CreateClassPage } from './pages/CreateClassPage'
import { HoldPage } from './pages/HoldPage'
import { MyApplicationsPage } from './pages/MyApplicationsPage'

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="brand-row">
            <Link to="/classes" className="brand">
              স্কুল ভর্তি
            </Link>
            <nav className="nav">
              <NavLink to="/classes" end>
                ক্লাস তালিকা
              </NavLink>
              <NavLink to="/classes/new">নতুন ক্লাস</NavLink>
              <NavLink to="/my-applications">আমার আবেদন</NavLink>
            </nav>
          </div>
          <StudentBar />
        </div>
      </header>

      <main className="container">
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
      </main>
    </>
  )
}
