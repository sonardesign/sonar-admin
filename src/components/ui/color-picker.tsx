import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Plus, Palette, Hash, Pipette } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  presetColors?: string[]
  onAddToPresets?: (color: string) => void
  className?: string
}

interface HSV {
  h: number
  s: number
  v: number
}

interface RGB {
  r: number
  g: number
  b: number
}

const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }).join("")
}

const rgbToHsv = (r: number, g: number, b: number): HSV => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  const s = max === 0 ? 0 : diff / max
  const v = max

  if (diff !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / diff + 2) / 6
        break
      case b:
        h = ((r - g) / diff + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 }
}

const hsvToRgb = (h: number, s: number, v: number): RGB => {
  h /= 360
  s /= 100
  v /= 100

  const c = v * s
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1))
  const m = v - c

  let r = 0, g = 0, b = 0

  if (h < 1/6) {
    r = c; g = x; b = 0
  } else if (h < 2/6) {
    r = x; g = c; b = 0
  } else if (h < 3/6) {
    r = 0; g = c; b = x
  } else if (h < 4/6) {
    r = 0; g = x; b = c
  } else if (h < 5/6) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

const defaultPresetColors = [
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

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  presetColors = defaultPresetColors,
  onAddToPresets,
  className = ''
}) => {
  const [currentColor, setCurrentColor] = useState(value)
  const [hexInput, setHexInput] = useState(value)
  const [rgb, setRgb] = useState<RGB>(hexToRgb(value))
  const [hsv, setHsv] = useState<HSV>(rgbToHsv(rgb.r, rgb.g, rgb.b))
  const [isDragging, setIsDragging] = useState(false)
  const [dragTarget, setDragTarget] = useState<'saturation' | 'hue' | null>(null)

  const saturationRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== currentColor) {
      setCurrentColor(value)
      setHexInput(value)
      const newRgb = hexToRgb(value)
      setRgb(newRgb)
      setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b))
    }
  }, [value, currentColor])

  const updateColor = useCallback((newRgb: RGB) => {
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
    setCurrentColor(hex)
    setHexInput(hex)
    setRgb(newRgb)
    onChange(hex)
  }, [onChange])

  const updateFromHsv = useCallback((newHsv: HSV) => {
    setHsv(newHsv)
    const newRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v)
    updateColor(newRgb)
  }, [updateColor])

  const handleSaturationMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragTarget('saturation')
    handleSaturationMove(e)
  }

  const handleSaturationMove = (e: React.MouseEvent) => {
    if (!saturationRef.current) return
    
    const rect = saturationRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    
    const s = (x / rect.width) * 100
    const v = ((rect.height - y) / rect.height) * 100
    
    updateFromHsv({ ...hsv, s, v })
  }

  const handleHueMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragTarget('hue')
    handleHueMove(e)
  }

  const handleHueMove = (e: React.MouseEvent) => {
    if (!hueRef.current) return
    
    const rect = hueRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    const h = (x / rect.width) * 360
    
    updateFromHsv({ ...hsv, h })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    if (dragTarget === 'saturation') {
      handleSaturationMove(e as any)
    } else if (dragTarget === 'hue') {
      handleHueMove(e as any)
    }
  }, [isDragging, dragTarget, hsv, updateFromHsv])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragTarget(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHexInput(value)
    
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const newRgb = hexToRgb(value)
      setRgb(newRgb)
      setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b))
      setCurrentColor(value)
      onChange(value)
    }
  }

  const handleRgbChange = (component: 'r' | 'g' | 'b', value: number) => {
    const newRgb = { ...rgb, [component]: Math.max(0, Math.min(255, value)) }
    setRgb(newRgb)
    setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b))
    updateColor(newRgb)
  }

  const handleAddToPresets = () => {
    if (onAddToPresets && !presetColors.includes(currentColor)) {
      onAddToPresets(currentColor)
    }
  }

  const saturationStyle = {
    backgroundColor: `hsl(${hsv.h}, 100%, 50%)`
  }

  const saturationPointerStyle = {
    left: `${hsv.s}%`,
    top: `${100 - hsv.v}%`
  }

  const huePointerStyle = {
    left: `${(hsv.h / 360) * 100}%`
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5" />
          Color Picker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Color Preview */}
        <div className="flex items-center gap-3">
          <div 
            className="w-16 h-16 rounded-lg border-2 border-border shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
          <div className="flex-1">
            <div className="text-sm font-medium">Current Color</div>
            <div className="text-xs text-muted-foreground font-mono">{currentColor}</div>
          </div>
        </div>

        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visual" className="flex items-center gap-1">
              <Pipette className="h-4 w-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="hex" className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              Hex
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-1">
              <Palette className="h-4 w-4" />
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-4">
            {/* Saturation/Value Picker */}
            <div className="space-y-2">
              <Label>Saturation & Brightness</Label>
              <div
                ref={saturationRef}
                className="relative w-full h-40 rounded-lg cursor-crosshair border border-border"
                style={saturationStyle}
                onMouseDown={handleSaturationMouseDown}
              >
                {/* White to transparent gradient (saturation) */}
                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent rounded-lg" />
                {/* Black to transparent gradient (brightness) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent rounded-lg" />
                {/* Pointer */}
                <div
                  className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg transform -translate-x-2 -translate-y-2 pointer-events-none"
                  style={saturationPointerStyle}
                />
              </div>
            </div>

            {/* Hue Picker */}
            <div className="space-y-2">
              <Label>Hue</Label>
              <div
                ref={hueRef}
                className="relative w-full h-6 rounded-lg cursor-pointer border border-border"
                style={{
                  background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                }}
                onMouseDown={handleHueMouseDown}
              >
                <div
                  className="absolute w-2 h-8 bg-white border-2 border-gray-300 rounded transform -translate-x-1 -translate-y-1 shadow-lg pointer-events-none"
                  style={huePointerStyle}
                />
              </div>
            </div>

            {/* RGB Sliders */}
            <div className="space-y-3">
              <Label>RGB Values</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <Label className="w-4">R</Label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={rgb.r}
                    onChange={(e) => handleRgbChange('r', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb.r}
                    onChange={(e) => handleRgbChange('r', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gradient-to-r from-black to-red-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <Label className="w-4">G</Label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={rgb.g}
                    onChange={(e) => handleRgbChange('g', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb.g}
                    onChange={(e) => handleRgbChange('g', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gradient-to-r from-black to-green-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <Label className="w-4">B</Label>
                  <Input
                    type="number"
                    min="0"
                    max="255"
                    value={rgb.b}
                    onChange={(e) => handleRgbChange('b', parseInt(e.target.value) || 0)}
                    className="w-20"
                  />
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={rgb.b}
                    onChange={(e) => handleRgbChange('b', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gradient-to-r from-black to-blue-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hex" className="space-y-4">
            <div className="space-y-2">
              <Label>Hex Color Code</Label>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={hexInput}
                  onChange={handleHexChange}
                  placeholder="#FF5733"
                  className="font-mono uppercase"
                  maxLength={7}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Enter a 6-digit hex color code (e.g., #FF5733)
              </div>
            </div>

            {/* Common Hex Colors */}
            <div className="space-y-2">
              <Label>Common Colors</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
                  '#FF00FF', '#00FFFF', '#FFA500', '#800080',
                  '#FFC0CB', '#A52A2A', '#808080', '#000000'
                ].map((color) => (
                  <button
                    key={color}
                    className="w-full h-8 rounded border border-border hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setHexInput(color)
                      const newRgb = hexToRgb(color)
                      setRgb(newRgb)
                      setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b))
                      setCurrentColor(color)
                      onChange(color)
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Preset Colors</Label>
              {onAddToPresets && !presetColors.includes(currentColor) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToPresets}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Current
                </Button>
              )}
            </div>

            <div className="grid grid-cols-8 gap-2">
              {presetColors.map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform ${
                    color === currentColor ? 'border-foreground ring-2 ring-primary' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setHexInput(color)
                    const newRgb = hexToRgb(color)
                    setRgb(newRgb)
                    setHsv(rgbToHsv(newRgb.r, newRgb.g, newRgb.b))
                    setCurrentColor(color)
                    onChange(color)
                  }}
                  title={color}
                />
              ))}
            </div>

            {presetColors.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No preset colors available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
