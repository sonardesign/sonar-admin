import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"

export interface ComboboxOption {
  value: string
  label: string
  color?: string
}

interface SimpleComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function SimpleCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  disabled = false,
  autoFocus = false,
}: SimpleComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  // Reset highlighted index when options change
  React.useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredOptions])

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0) {
      const element = document.querySelector(`[data-option-index="${highlightedIndex}"]`)
      if (element) {
        element.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  const handleSelect = (optionValue: string) => {
    console.log('SimpleCombobox handleSelect called with:', optionValue)
    onValueChange?.(optionValue)
    setOpen(false)
    setSearchValue("")
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setSearchValue("")
        setHighlightedIndex(-1)
        break
    }
  }

  React.useEffect(() => {
    if (open && autoFocus) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        const input = document.querySelector('[data-combobox-search]') as HTMLInputElement
        if (input) {
          input.focus()
        }
      }, 100)
    }
  }, [open, autoFocus])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            {selectedOption?.color && (
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex flex-col">
          <div className="flex items-center border-b px-3">
            <Input
              data-combobox-search
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 focus:ring-0 focus:ring-offset-0"
              autoFocus={autoFocus}
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  data-option-index={index}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    highlightedIndex === index && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {option.color && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
