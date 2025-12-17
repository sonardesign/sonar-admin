import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { SimpleCombobox, ComboboxOption } from './ui/simple-combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { notifications } from '../lib/notifications';

interface InviteMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  availableUsers: Array<{ id: string; full_name: string; email: string }>;
  existingMemberIds: string[];
  onMemberAdded: () => void;
}

export const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  open,
  onOpenChange,
  projectId,
  projectName,
  availableUsers,
  existingMemberIds,
  onMemberAdded
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'manager'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out users who are already members
  const filteredUsers = useMemo(() => {
    return availableUsers.filter(user => !existingMemberIds.includes(user.id));
  }, [availableUsers, existingMemberIds]);

  // Prepare combobox options
  const userOptions: ComboboxOption[] = useMemo(() => {
    return filteredUsers.map(user => ({
      value: user.id,
      label: `${user.full_name} (${user.email})`
    }));
  }, [filteredUsers]);

  const handleSubmit = async () => {
    if (!selectedUserId) {
      notifications.createError('Invite Member', 'Please select a user');
      return;
    }

    setIsSubmitting(true);

    try {
      // Import the service
      const { projectMembersService } = await import('../services/supabaseService');
      
      const { error } = await projectMembersService.addProjectMember(
        projectId,
        selectedUserId,
        selectedRole
      );

      if (error) {
        notifications.createError('Invite Member', error.message);
      } else {
        const userName = availableUsers.find(u => u.id === selectedUserId)?.full_name || 'User';
        notifications.createSuccess(
          'Member Added',
          `${userName} has been added as ${selectedRole === 'manager' ? 'a manager' : 'a member'}`
        );
        
        // Reset form
        setSelectedUserId('');
        setSelectedRole('member');
        
        // Notify parent
        onMemberAdded();
        
        // Close modal
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error adding project member:', error);
      notifications.createError('Invite Member', 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedUserId('');
    setSelectedRole('member');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Add team members to {projectName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user-select">Select User</Label>
            <SimpleCombobox
              options={userOptions}
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              placeholder="Select a user..."
              searchPlaceholder="Search users..."
              emptyText="No available users."
              className="w-full"
              autoFocus={true}
            />
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                All users are already members of this project.
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role-select">Project Role</Label>
            <Select value={selectedRole} onValueChange={(value: 'member' | 'manager') => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Member</span>
                    <span className="text-xs text-muted-foreground">Can log time and view project</span>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Manager</span>
                    <span className="text-xs text-muted-foreground">Can view all time entries and manage project</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || isSubmitting || filteredUsers.length === 0}>
            {isSubmitting ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

