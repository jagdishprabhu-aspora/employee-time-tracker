'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ClockControls({ userId, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [currentShift, setCurrentShift] = useState(null)
  const [currentBreak, setCurrentBreak] = useState(null)
  const [status, setStatus] = useState('clocked_out')
  const supabase = createClient()

  useEffect(() => {
    loadCurrentStatus()
  }, [userId])

  async function loadCurrentStatus() {
    // Get current open shift
    const { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .is('clock_out', null)
      .single()

    setCurrentShift(shift)

    if (shift) {
      // Check for open break
      const { data: breakData } = await supabase
        .from('breaks')
        .select('*')
        .eq('shift_id', shift.id)
        .is('break_end', null)
        .single()

      setCurrentBreak(breakData)
      setStatus(breakData ? 'on_break' : 'working')
    } else {
      setStatus('clocked_out')
    }
  }

  async function handleClockIn() {
    setLoading(true)
    const { error } = await supabase
      .from('shifts')
      .insert([{ user_id: userId, clock_in: new Date().toISOString() }])

    if (error) {
      alert('Error clocking in: ' + error.message)
    } else {
      await loadCurrentStatus()
      onUpdate()
    }
    setLoading(false)
  }

  async function handleClockOut() {
    setLoading(true)
    
    // End any open breaks first
    if (currentBreak) {
      await supabase
        .from('breaks')
        .update({ break_end: new Date().toISOString() })
        .eq('id', currentBreak.id)
    }

    // Clock out
    const { error } = await supabase
      .from('shifts')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', currentShift.id)

    if (error) {
      alert('Error clocking out: ' + error.message)
    } else {
      await loadCurrentStatus()
      onUpdate()
    }
    setLoading(false)
  }

  async function handleStartBreak() {
    setLoading(true)
    const { error } = await supabase
      .from('breaks')
      .insert([{ 
        shift_id: currentShift.id, 
        break_start: new Date().toISOString() 
      }])

    if (error) {
      alert('Error starting break: ' + error.message)
    } else {
      await loadCurrentStatus()
      onUpdate()
    }
    setLoading(false)
  }

  async function handleEndBreak() {
    setLoading(true)
    const { error } = await supabase
      .from('breaks')
      .update({ break_end: new Date().toISOString() })
      .eq('id', currentBreak.id)

    if (error) {
      alert('Error ending break: ' + error.message)
    } else {
      await loadCurrentStatus()
      onUpdate()
    }
    setLoading(false)
  }

  const statusConfig = {
    clocked_out: {
      label: 'Clocked Out',
      color: 'bg-gray-100 text-gray-700',
      dot: 'bg-gray-400'
    },
    working: {
      label: 'Working',
      color: 'bg-green-100 text-green-700',
      dot: 'bg-green-500'
    },
    on_break: {
      label: 'On Break',
      color: 'bg-yellow-100 text-yellow-700',
      dot: 'bg-yellow-500'
    }
  }

  const config = statusConfig[status]

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className="flex items-center justify-center">
        <div className={`${config.color} px-6 py-3 rounded-full flex items-center gap-3`}>
          <div className={`w-3 h-3 ${config.dot} rounded-full animate-pulse`}></div>
          <span className="font-semibold">{config.label}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleClockIn}
          disabled={loading || status !== 'clocked_out'}
          className="px-6 py-4 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Clock In
        </button>

        <button
          onClick={handleClockOut}
          disabled={loading || status === 'clocked_out'}
          className="px-6 py-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Clock Out
        </button>

        <button
          onClick={handleStartBreak}
          disabled={loading || status !== 'working'}
          className="px-6 py-4 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Start Break
        </button>

        <button
          onClick={handleEndBreak}
          disabled={loading || status !== 'on_break'}
          className="px-6 py-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          End Break
        </button>
      </div>
    </div>
  )
}
