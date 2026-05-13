import { useEffect } from 'react'
import { useAgentStore } from './application/stores/agentStore'
import { Layout } from './presentation/layout/Layout'
import './App.css'

function App() {
  const init = useAgentStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return <Layout />
}

export default App
