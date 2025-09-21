import React from 'react'
import { Plus } from 'lucide-react'
import { Label } from './label'

interface ColorPresetSelectorProps {
  selectedColor: string
  presetColors: string[]
  onColorSelect: (color: string) => void
  onAddNewColor: () => void
  className?: string
}

export const ColorPresetSelector: React.FC<ColorPresetSelectorProps> = ({
  selectedColor,
  presetColors,
  onColorSelect,
  onAddNewColor,
  className = ''
}) => {
  return (
    <div className={className}>
      <Label className="text-sm font-medium">Project Color</Label>
      <div className="grid grid-cols-8 gap-2 mt-2">
        {/* Add New Color Button - First Position */}
        <button
          type="button"
          className="w-10 h-10 rounded-lg border-2 border-dashed border-muted-foreground/50 hover:border-primary hover:bg-muted/50 transition-all duration-200 flex items-center justify-center group"
          onClick={onAddNewColor}
          title="Add custom color"
        >
          <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        {/* Preset Colors */}
        {presetColors.map((color, index) => (
          <button
            key={`${color}-${index}`}
            type="button"
            className={`w-10 h-10 rounded-lg border-2 hover:scale-110 transition-all duration-200 ${
              color === selectedColor 
                ? 'border-foreground ring-2 ring-primary ring-offset-2' 
                : 'border-border hover:border-foreground/50'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect(color)}
            title={color}
          />
        ))}
      </div>
      
      {/* Selected Color Info */}
      {selectedColor && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div 
            className="w-4 h-4 rounded border border-border"
            style={{ backgroundColor: selectedColor }}
          />
          <span className="font-mono">{selectedColor}</span>
        </div>
      )}
    </div>
  )
}
