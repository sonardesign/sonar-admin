import { useEffect, useCallback, useRef } from 'react'

/**
 * Keyboard shortcut configuration interface
 */
export interface KeyboardShortcutConfig {
  /** The key to listen for (e.g., 'n', 'Enter', 'Escape') */
  key: string
  /** Whether Ctrl key must be pressed (Windows/Linux) */
  ctrlKey?: boolean
  /** Whether Cmd key must be pressed (macOS) */
  metaKey?: boolean
  /** Whether Shift key must be pressed */
  shiftKey?: boolean
  /** Whether Alt key must be pressed */
  altKey?: boolean
  /** Callback function when shortcut is triggered */
  handler: (event: KeyboardEvent) => void
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean
  /** Whether to stop event propagation */
  stopPropagation?: boolean
  /** Whether the shortcut should work when focus is in input/textarea/contenteditable */
  allowInInputs?: boolean
  /** Custom condition function - shortcut only triggers if this returns true */
  condition?: (event: KeyboardEvent) => boolean
}

/**
 * Custom hook for handling keyboard shortcuts in React
 * 
 * Best practices implemented:
 * - Handles both macOS (Cmd) and Windows/Linux (Ctrl) automatically
 * - Respects input fields by default (doesn't trigger in inputs unless allowed)
 * - Only prevents default when shortcut actually matches
 * - Uses refs to avoid stale closures
 * - Properly cleans up event listeners
 * 
 * @param shortcuts Array of keyboard shortcut configurations
 * @param deps Dependencies array (optional) - re-registers shortcuts when deps change
 * 
 * @example
 * ```tsx
 * useKeyboardShortcut([
 *   {
 *     key: 'n',
 *     ctrlKey: true,
 *     shiftKey: true,
 *     handler: () => console.log('Ctrl+Shift+N pressed'),
 *     preventDefault: true
 *   }
 * ])
 * ```
 */
export const useKeyboardShortcut = (
  shortcuts: KeyboardShortcutConfig[],
  deps: React.DependencyList = []
) => {
  // Use refs to store handlers to avoid stale closures
  const shortcutsRef = useRef<KeyboardShortcutConfig[]>(shortcuts)
  const handlersRef = useRef<Map<string, KeyboardShortcutConfig>>(new Map())

  // Update refs when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
    
    // Create a map for quick lookup
    const map = new Map<string, KeyboardShortcutConfig>()
    shortcuts.forEach(shortcut => {
      const key = `${shortcut.key}-${shortcut.ctrlKey || false}-${shortcut.metaKey || false}-${shortcut.shiftKey || false}-${shortcut.altKey || false}`
      map.set(key, shortcut)
    })
    handlersRef.current = map
  }, [shortcuts, ...deps])

  // Check if the current target is an input field
  const isInputElement = useCallback((target: EventTarget | null): boolean => {
    if (!target) return false
    
    const element = target as HTMLElement
    const tagName = element.tagName?.toLowerCase()
    const isContentEditable = element.getAttribute('contenteditable') === 'true'
    
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      isContentEditable ||
      element.closest('[contenteditable="true"]') !== null
    )
  }, [])

  // Main keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    
    // Debug: log ALL keydown events when Ctrl/Cmd is pressed
    if (event.ctrlKey || event.metaKey) {
      console.log('[KeyboardShortcut] Key pressed:', {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        target: (event.target as HTMLElement)?.tagName,
        registeredShortcuts: shortcutsRef.current.length,
        defaultPrevented: event.defaultPrevented
      })
    }
    
    // Special handling: if key is 'n' and Ctrl/Cmd is pressed, log it prominently
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
      console.log('🚨🚨🚨 CTRL+N DETECTED IN HOOK! 🚨🚨🚨', {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        defaultPrevented: event.defaultPrevented
      })
    }
    
    let shouldPreventDefault = false
    let matchedShortcut: KeyboardShortcutConfig | null = null
    
    // Check all registered shortcuts
    for (const shortcut of shortcutsRef.current) {
      // Normalize key comparison (case-insensitive)
      if (shortcut.key.toLowerCase() !== key) continue

      // Check modifier keys - support both Ctrl (Windows/Linux) and Cmd (macOS)
      const hasCtrlOrCmd = event.ctrlKey || event.metaKey
      const needsCtrlOrCmd = shortcut.ctrlKey || shortcut.metaKey
      
      // If shortcut needs Ctrl/Cmd but user didn't press it, skip
      if (needsCtrlOrCmd && !hasCtrlOrCmd) continue
      
      // If shortcut doesn't need Ctrl/Cmd but user pressed it, skip
      if (!needsCtrlOrCmd && hasCtrlOrCmd) continue
      
      // Check Shift
      if (shortcut.shiftKey !== event.shiftKey) continue
      
      // Check Alt
      if (shortcut.altKey !== event.altKey) continue

      // Check if we're in an input field
      const inInput = isInputElement(event.target)
      if (inInput && !shortcut.allowInInputs) {
        console.log('[KeyboardShortcut] Skipped - in input field')
        continue
      }

      // Check custom condition if provided
      if (shortcut.condition && !shortcut.condition(event)) {
        console.log('[KeyboardShortcut] Skipped - condition failed')
        continue
      }

      // Match found!
      console.log('[KeyboardShortcut] Match found!', shortcut.key)
      shouldPreventDefault = shortcut.preventDefault ?? false
      matchedShortcut = shortcut
      break // Only execute first match
    }

    // Prevent default EARLY if any shortcut matches and needs it
    if (shouldPreventDefault && matchedShortcut) {
      console.log('[KeyboardShortcut] Preventing default')
      event.preventDefault()
      event.stopPropagation()
    }

    // Execute handler if match found
    if (matchedShortcut) {
      console.log('[KeyboardShortcut] Executing handler')
      matchedShortcut.handler(event)
    }
  }, [isInputElement])

  // Register event listener with capture phase to catch events early
  // This ensures we can preventDefault() before the browser processes it
  useEffect(() => {
    console.log('[KeyboardShortcut] Registering listener, shortcuts:', shortcutsRef.current.length)
    
    // Register on both window and document with capture phase
    // This ensures we catch the event as early as possible
    const options = { capture: true, passive: false } as AddEventListenerOptions
    
    window.addEventListener('keydown', handleKeyDown, options)
    document.addEventListener('keydown', handleKeyDown, options)
    document.documentElement.addEventListener('keydown', handleKeyDown, options)
    
    return () => {
      console.log('[KeyboardShortcut] Unregistering listener')
      window.removeEventListener('keydown', handleKeyDown, options)
      document.removeEventListener('keydown', handleKeyDown, options)
      document.documentElement.removeEventListener('keydown', handleKeyDown, options)
    }
  }, [handleKeyDown])
}

/**
 * Helper function to create a keyboard shortcut config
 * Automatically handles both Ctrl (Windows/Linux) and Cmd (macOS)
 * 
 * @example
 * ```tsx
 * const shortcut = createShortcut('n', { shift: true }, () => {
 *   console.log('Ctrl/Cmd+Shift+N')
 * })
 * ```
 */
export const createShortcut = (
  key: string,
  modifiers: {
    ctrl?: boolean
    cmd?: boolean
    shift?: boolean
    alt?: boolean
  } = {}, // Default to empty object
  handler: (event: KeyboardEvent) => void,
  options?: {
    preventDefault?: boolean
    stopPropagation?: boolean
    allowInInputs?: boolean
    condition?: (event: KeyboardEvent) => boolean
  }
): KeyboardShortcutConfig => {
  // If ctrl or cmd is explicitly true, set it to true
  // If not specified, default to true for cross-platform support
  const ctrlKey = modifiers.ctrl !== undefined ? modifiers.ctrl : true
  const metaKey = modifiers.cmd !== undefined ? modifiers.cmd : true
  
  console.log('[createShortcut] Creating shortcut:', {
    key,
    ctrlKey,
    metaKey,
    shiftKey: modifiers.shift ?? false,
    altKey: modifiers.alt ?? false,
    preventDefault: options?.preventDefault ?? true
  })
  
  return {
    key,
    ctrlKey,
    metaKey,
    shiftKey: modifiers.shift ?? false,
    altKey: modifiers.alt ?? false,
    handler,
    preventDefault: options?.preventDefault ?? true,
    stopPropagation: options?.stopPropagation ?? false,
    allowInInputs: options?.allowInInputs ?? false,
    condition: options?.condition
  }
}

