/**
 * UptimeWorker - Modern Status Page Monitoring
 * Copyright (c) 2025 Slym B.
 * Licensed under the MIT License
 */

import { Routes, Route } from 'react-router-dom'
import StatusPage from './pages/StatusPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<StatusPage />} />
    </Routes>
  )
}

export default App
