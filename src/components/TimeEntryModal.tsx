import React from 'react'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { SimpleCombobox, ComboboxOption } from './ui/simple-combobox'
import { Checkbox } from './ui/checkbox'

interface TimeEntryModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  
  // Time slot info
  startTime: Date | null
  endTime: Date | null
  
  // Form values
  projectId: string
  description: string
  entryType: 'planned' | 'reported'
  isBillable: boolean
  duration: string // HH:MM format
  startTimeString: string // HH:mm format
  endTimeString: string // HH:mm format
  
  // Options
  projectOptions: ComboboxOption[]
  
  // Handlers
  onProjectChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onEntryTypeChange: (value: 'planned' | 'reported') => void
  onBillableChange: (value: boolean) => void
  onDurationChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onSave: () => void
  onDelete?: () => void
  
  // Optional fields for edit mode
  taskNumber?: string
}

export const TimeEntryModal: React.FC<TimeEntryModalProps> = ({
  isOpen,
  onClose,
  mode,
  startTime,
  endTime,
  projectId,
  description,
  entryType,
  isBillable,
  duration,
  startTimeString,
  endTimeString,
  projectOptions,
  onProjectChange,
  onDescriptionChange,
  onEntryTypeChange,
  onBillableChange,
  onDurationChange,
  onStartTimeChange,
  onEndTimeChange,
  onSave,
  onDelete,
  taskNumber
}) => {
  const navigate = useNavigate()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Time Entry' : 'Edit Time Entry'}</DialogTitle>
          <DialogDescription>
            {startTime && endTime && (
              <>
                {moment(startTime).format('dddd, MMMM Do YYYY')} from{' '}
                {moment(startTime).format('HH:mm')} to{' '}
                {moment(endTime).format('HH:mm')}
                {' '}({Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes)
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={entryType} onValueChange={(value) => onEntryTypeChange(value as 'planned' | 'reported')} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="reported">Reported</TabsTrigger>
              <TabsTrigger value="planned">Planned</TabsTrigger>
            </TabsList>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="non-billable" 
                checked={!isBillable}
                onCheckedChange={(checked) => onBillableChange(!checked)}
              />
              <Label 
                htmlFor="non-billable" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Non-billable
              </Label>
            </div>
          </div>
          
          {/* Reported Tab */}
          <TabsContent value="reported" className="space-y-4">
            <div>
              <Label htmlFor="projectSelect">Project</Label>
              <div className="mt-1">
                <SimpleCombobox
                  options={projectOptions}
                  value={projectId}
                  onValueChange={onProjectChange}
                  placeholder="Select a project..."
                  searchPlaceholder="Search projects..."
                  emptyText="No projects found."
                  className="w-full"
                />
              </div>
            </div>

            {/* Duration, Start Time, End Time Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="duration">Duration (HH:MM)</Label>
                <Input
                  id="duration"
                  type="text"
                  placeholder="00:00"
                  value={duration}
                  onChange={(e) => onDurationChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTimeString}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTimeString}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="taskDescription">Task Title</Label>
              <Textarea
                id="taskDescription"
                placeholder="Enter task title..."
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="mt-1"
                autoFocus
              />
              {taskNumber && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const slug = taskNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '';
                    navigate(`/tasks/${taskNumber}/${slug}`);
                  }}
                >
                  Jump to Task
                </Button>
              )}
            </div>

            <div className={mode === 'edit' ? 'flex justify-between pt-4 border-t' : 'flex justify-end space-x-2 pt-4 border-t'}>
              {mode === 'edit' && onDelete && (
                <Button variant="destructive" onClick={onDelete}>
                  Delete Entry
                </Button>
              )}
              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onSave} disabled={!projectId}>
                  {mode === 'create' ? 'Create Entry' : 'Update'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Planned Tab */}
          <TabsContent value="planned" className="space-y-4">
            <div>
              <Label htmlFor="projectSelectPlanned">Project</Label>
              <div className="mt-1">
                <SimpleCombobox
                  options={projectOptions}
                  value={projectId}
                  onValueChange={onProjectChange}
                  placeholder="Select a project..."
                  searchPlaceholder="Search projects..."
                  emptyText="No projects found."
                  className="w-full"
                />
              </div>
            </div>

            {/* Duration, Start Time, End Time Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="durationPlanned">Duration (HH:MM)</Label>
                <Input
                  id="durationPlanned"
                  type="text"
                  placeholder="00:00"
                  value={duration}
                  onChange={(e) => onDurationChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="startTimePlanned">Start Time</Label>
                <Input
                  id="startTimePlanned"
                  type="time"
                  value={startTimeString}
                  onChange={(e) => onStartTimeChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="endTimePlanned">End Time</Label>
                <Input
                  id="endTimePlanned"
                  type="time"
                  value={endTimeString}
                  onChange={(e) => onEndTimeChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="taskDescriptionPlanned">Task Title</Label>
              <Textarea
                id="taskDescriptionPlanned"
                placeholder="Enter task title..."
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="mt-1"
                autoFocus
              />
              {taskNumber && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const slug = taskNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-') || '';
                    navigate(`/tasks/${taskNumber}/${slug}`);
                  }}
                >
                  Jump to Task
                </Button>
              )}
            </div>

            <div className={mode === 'edit' ? 'flex justify-between pt-4 border-t' : 'flex justify-end space-x-2 pt-4 border-t'}>
              {mode === 'edit' && onDelete && (
                <Button variant="destructive" onClick={onDelete}>
                  Delete Entry
                </Button>
              )}
              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={onSave} disabled={!projectId}>
                  {mode === 'create' ? 'Create Entry' : 'Update'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

