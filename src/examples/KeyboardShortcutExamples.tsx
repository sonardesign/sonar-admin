/**
 * Keyboard Shortcut Examples
 * 
 * Ez a fájl különböző példákat mutat a useKeyboardShortcut hook használatára.
 * Production-ready példák gyakori felhasználási esetekre.
 */

import React, { useState } from 'react'
import { useKeyboardShortcut, createShortcut } from '../hooks/useKeyboardShortcut'

// ============================================
// 1. ALAPVETŐ HASZNÁLAT: Ctrl/Cmd + Shift + N
// ============================================
export const BasicExample: React.FC = () => {
  const [count, setCount] = useState(0)

  useKeyboardShortcut([
    createShortcut(
      'n',
      { shift: true }, // Ctrl/Cmd + Shift + N
      () => {
        setCount(prev => prev + 1)
        console.log('New item created!')
      },
      {
        preventDefault: true, // Blokkolja a böngésző alapértelmezett viselkedését
        allowInInputs: false   // Ne aktiválódjon input mezőkben
      }
    )
  ])

  return (
    <div>
      <p>Press Ctrl/Cmd + Shift + N to increment: {count}</p>
      <input type="text" placeholder="Try typing here - shortcut won't trigger" />
    </div>
  )
}

// ============================================
// 2. TÖBB SHORTCUT EGYSZERRE
// ============================================
export const MultipleShortcutsExample: React.FC = () => {
  const [actions, setActions] = useState<string[]>([])

  useKeyboardShortcut([
    // Ctrl/Cmd + S: Save
    createShortcut(
      's',
      {},
      () => {
        setActions(prev => [...prev, 'Saved'])
        console.log('Document saved')
      },
      { preventDefault: true }
    ),
    // Ctrl/Cmd + N: New
    createShortcut(
      'n',
      {},
      () => {
        setActions(prev => [...prev, 'New document'])
        console.log('New document created')
      },
      { preventDefault: true }
    ),
    // Escape: Close
    {
      key: 'Escape',
      handler: () => {
        setActions(prev => [...prev, 'Closed'])
        console.log('Modal closed')
      },
      preventDefault: false // Escape-nek általában nem kell preventDefault
    }
  ])

  return (
    <div>
      <p>Actions: {actions.join(', ')}</p>
      <p>Try: Ctrl/Cmd+S, Ctrl/Cmd+N, Escape</p>
    </div>
  )
}

// ============================================
// 3. SHORTCUT INPUT MEZŐKBEN IS
// ============================================
export const InputShortcutExample: React.FC = () => {
  const [searchOpen, setSearchOpen] = useState(false)

  useKeyboardShortcut([
    // Ctrl/Cmd + K: Open search (működik input mezőkben is)
    createShortcut(
      'k',
      {},
      () => {
        setSearchOpen(prev => !prev)
        console.log('Search toggled')
      },
      {
        preventDefault: true,
        allowInInputs: true // Ez a kulcs! Engedélyezi input mezőkben is
      }
    )
  ])

  return (
    <div>
      <p>Press Ctrl/Cmd + K to toggle search (works in inputs too!)</p>
      <input type="text" placeholder="Try Ctrl/Cmd+K here" />
      {searchOpen && <div>Search is open!</div>}
    </div>
  )
}

// ============================================
// 4. FELTÉTELES SHORTCUT
// ============================================
export const ConditionalShortcutExample: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  useKeyboardShortcut([
    {
      key: 'n',
      ctrlKey: true,
      metaKey: true,
      handler: () => {
        setIsModalOpen(true)
        console.log('Modal opened')
      },
      preventDefault: true,
      // Csak akkor aktiválódik, ha nincs megnyitva modal
      condition: (event) => {
        return !document.querySelector('[role="dialog"]')
      }
    }
  ])

  return (
    <div>
      <p>Press Ctrl/Cmd + N (only works when modal is closed)</p>
      {isModalOpen && (
        <div role="dialog" style={{ border: '1px solid red', padding: '1rem' }}>
          Modal is open - Ctrl/Cmd+N won't work now
          <button onClick={() => setIsModalOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}

// ============================================
// 5. STATE-TŐL FÜGGŐ SHORTCUT
// ============================================
export const StateDependentShortcutExample: React.FC = () => {
  const [userId, setUserId] = useState('user-123')
  const [lastAction, setLastAction] = useState<string>('')

  // Fontos: használj dependencies array-t, ha a handler függ state-től!
  useKeyboardShortcut([
    createShortcut(
      'n',
      {},
      () => {
        setLastAction(`Created for user: ${userId}`)
        console.log(`Creating for user: ${userId}`)
      },
      { preventDefault: true }
    )
  ], [userId]) // Re-regisztrálódik, amikor userId változik

  return (
    <div>
      <p>Current User: {userId}</p>
      <p>Last Action: {lastAction}</p>
      <button onClick={() => setUserId('user-456')}>Change User</button>
      <p>Press Ctrl/Cmd + N</p>
    </div>
  )
}

// ============================================
// 6. PLATFORM-SPECIFIKUS SHORTCUT
// ============================================
export const PlatformSpecificExample: React.FC = () => {
  useKeyboardShortcut([
    // Csak Windows/Linux (Ctrl, nem Cmd)
    {
      key: 'n',
      ctrlKey: true,
      metaKey: false, // macOS-on nem működik
      handler: () => {
        console.log('Windows/Linux only: Ctrl+N')
      },
      preventDefault: true
    },
    // Csak macOS (Cmd, nem Ctrl)
    {
      key: 'm',
      ctrlKey: false,
      metaKey: true, // Windows/Linux-on nem működik
      handler: () => {
        console.log('macOS only: Cmd+M')
      },
      preventDefault: true
    }
  ])

  return (
    <div>
      <p>Windows/Linux: Try Ctrl+N</p>
      <p>macOS: Try Cmd+M</p>
    </div>
  )
}

// ============================================
// 7. KOMPLEX SHORTCUT (Alt + Shift + Key)
// ============================================
export const ComplexShortcutExample: React.FC = () => {
  useKeyboardShortcut([
    createShortcut(
      't',
      { alt: true, shift: true }, // Alt + Shift + T
      () => {
        console.log('Complex shortcut: Alt+Shift+T')
      },
      { preventDefault: true }
    )
  ])

  return (
    <div>
      <p>Press Alt + Shift + T</p>
    </div>
  )
}

// ============================================
// 8. VALÓS PÉLDA: TASK CREATION MODAL
// ============================================
export const TaskCreationExample: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => {
    setIsModalOpen(true)
    console.log('Task creation modal opened')
  }

  useKeyboardShortcut([
    createShortcut(
      'n',
      {},
      openModal,
      {
        preventDefault: true, // Blokkolja a böngésző új ablak funkcióját
        allowInInputs: false,  // Ne aktiválódjon input mezőkben
        condition: (event) => {
          // Csak akkor aktiválódik, ha nincs megnyitva modal
          return !document.querySelector('[role="dialog"]')
        }
      }
    )
  ])

  return (
    <div>
      <p>Press Ctrl/Cmd + N to open task creation modal</p>
      {isModalOpen && (
        <div role="dialog" style={{ border: '1px solid', padding: '1rem', marginTop: '1rem' }}>
          <h3>Create New Task</h3>
          <button onClick={() => setIsModalOpen(false)}>Close</button>
        </div>
      )}
    </div>
  )
}

