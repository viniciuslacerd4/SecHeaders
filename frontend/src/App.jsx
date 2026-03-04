import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Result from './pages/Result'
import History from './pages/History'
import Compare from './pages/Compare'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/result" element={<Result />} />
        <Route path="/result/:id" element={<Result />} />
        <Route path="/history" element={<History />} />
        <Route path="/compare" element={<Compare />} />
      </Route>
    </Routes>
  )
}
