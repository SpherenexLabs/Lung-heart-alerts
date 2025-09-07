import { useState } from 'react'
import './App.css'
import MedicalDashboard from './components/MedicalDashboard'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <MedicalDashboard />
    </>
  )
}

export default App
