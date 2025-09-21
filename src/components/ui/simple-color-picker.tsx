import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Hash, Palette } from 'lucide-react'

interface SimpleColorPickerProps {
  value: string
  onChange: (color: string) => void
  onSave?: () => void
  onCancel?: () => void
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

export const SimpleColorPicker: React.FC<SimpleColorPickerProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
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
          Create Custom Color
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Preview */}
        <div className="flex items-center gap-4">
          <div 
            className="w-20 h-20 rounded-lg border-2 border-border shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
          <div className="flex-1">
            <div className="text-lg font-medium">Selected Color</div>
            <div className="text-sm text-muted-foreground font-mono">{currentColor}</div>
          </div>
        </div>

        {/* Saturation/Value Picker */}
        <div className="space-y-3">
          <div
            ref={saturationRef}
            className="relative w-full h-48 rounded-lg cursor-crosshair border border-border"
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

          {/* Hue Picker */}
          <div
            ref={hueRef}
            className="relative w-full h-8 rounded-lg cursor-pointer border border-border"
            style={{
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
            onMouseDown={handleHueMouseDown}
          >
            <div
              className="absolute w-3 h-10 bg-white border-2 border-gray-300 rounded transform -translate-x-1.5 -translate-y-1 shadow-lg pointer-events-none"
              style={huePointerStyle}
            />
          </div>
        </div>

        {/* Hex Input */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Hex Color Code
          </Label>
          <Input
            type="text"
            value={hexInput}
            onChange={handleHexChange}
            placeholder="#FF5733"
            className="font-mono uppercase text-lg"
            maxLength={7}
          />
          <div className="text-xs text-muted-foreground">
            Enter a 6-digit hex color code (e.g., #FF5733)
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onSave && (
            <Button onClick={onSave}>
              Save Color
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
