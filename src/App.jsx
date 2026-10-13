import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Join from './pages/Join'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminLive from './pages/AdminLive'
import AdminAnalytics from './pages/AdminAnalytics'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:code" element={<Join />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/live/:id" element={<AdminLive />} />
        <Route path="/admin/analytics/:id" element={<AdminAnalytics />} />
      </Routes>
    </BrowserRouter>
  )
}