import { useState } from 'react'
import VoiceShoppingAssistant from './VoiceShoppingAssistant'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <VoiceShoppingAssistant/>
    </>
  )
}

export default App
