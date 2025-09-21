import { useState, useEffect, useCallback } from 'react'

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#dc2626', // red-600
  '#ea580c', // orange-600
  '#ca8a04', // yellow-600
  '#16a34a', // green-600
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#db2777', // pink-600
  '#4b5563', // gray-600
]

const STORAGE_KEY = 'sonar-admin-custom-colors'
const MAX_CUSTOM_COLORS = 32

export const useCustomColors = () => {
  const [customColors, setCustomColors] = useState<string[]>([])
  const [allColors, setAllColors] = useState<string[]>(DEFAULT_COLORS)

  // Load custom colors from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          console.log('📋 Loaded custom colors:', parsed.length)
          setCustomColors(parsed)
          setAllColors([...DEFAULT_COLORS, ...parsed])
        }
      }
    } catch (error) {
      console.error('❌ Error loading custom colors:', error)
    }
  }, [])

  // Save custom colors to localStorage
  const saveCustomColors = useCallback((colors: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
      console.log('💾 Saved custom colors:', colors.length)
    } catch (error) {
      console.error('❌ Error saving custom colors:', error)
    }
  }, [])

  // Add a new custom color
  const addCustomColor = useCallback((color: string) => {
    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      console.warn('⚠️ Invalid color format:', color)
      return false
    }

    // Check if color already exists
    if (allColors.includes(color.toLowerCase()) || allColors.includes(color.toUpperCase())) {
      console.log('ℹ️ Color already exists:', color)
      return false
    }

    const newCustomColors = [color, ...customColors].slice(0, MAX_CUSTOM_COLORS)
    setCustomColors(newCustomColors)
    setAllColors([...DEFAULT_COLORS, ...newCustomColors])
    saveCustomColors(newCustomColors)
    
    console.log('✅ Added custom color:', color)
    return true
  }, [customColors, allColors, saveCustomColors])

  // Remove a custom color
  const removeCustomColor = useCallback((color: string) => {
    const newCustomColors = customColors.filter(c => 
      c.toLowerCase() !== color.toLowerCase()
    )
    setCustomColors(newCustomColors)
    setAllColors([...DEFAULT_COLORS, ...newCustomColors])
    saveCustomColors(newCustomColors)
    
    console.log('🗑️ Removed custom color:', color)
  }, [customColors, saveCustomColors])

  // Clear all custom colors
  const clearCustomColors = useCallback(() => {
    setCustomColors([])
    setAllColors(DEFAULT_COLORS)
    localStorage.removeItem(STORAGE_KEY)
    console.log('🧹 Cleared all custom colors')
  }, [])

  // Get color statistics
  const getColorStats = useCallback(() => {
    return {
      totalColors: allColors.length,
      defaultColors: DEFAULT_COLORS.length,
      customColors: customColors.length,
      maxCustomColors: MAX_CUSTOM_COLORS,
      canAddMore: customColors.length < MAX_CUSTOM_COLORS
    }
  }, [allColors.length, customColors.length])

  return {
    // Color arrays
    defaultColors: DEFAULT_COLORS,
    customColors,
    allColors,
    
    // Actions
    addCustomColor,
    removeCustomColor,
    clearCustomColors,
    
    // Utilities
    getColorStats
  }
}
