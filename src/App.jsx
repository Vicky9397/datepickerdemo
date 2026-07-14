import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { SBDateRangePicker } from './MuiDateRangePicker'
import { SBDateRangePickerCustom } from './CustomDateRangePicker'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div style={{display:'flex', flexDirection:'column'}}>
          <label>MUI date range picker</label>
          <div><SBDateRangePicker/></div>
        </div>
        <div style={{display:'flex', flexDirection:'column'}}>
          <label>Custom date range picker</label>
          <div><SBDateRangePickerCustom/></div>
        </div>
      </section>
    </>
  )
}

export default App
