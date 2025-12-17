import React, { useState, useEffect } from 'react'
import { Page } from '../components/Page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Users, Plus, Trash2, Mail, UserCircle } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { useSupabaseAppState } from '../hooks/useSupabaseAppState'
import { supabase } from '../lib/supabase'
import { notifications } from '../lib/notifications'
import { ROLE_BADGES } from '../lib/permissions'

export const Settings: React.FC = () => {
  const { isAdmin } = usePermissions()
  const { users, refresh } = useSupabaseAppState()
  
  // Invite user modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'member' as 'admin' | 'manager' | 'member'
  })

  // Redirect non-admins
  if (!isAdmin) {
    return (
      <Page title="Settings" subtitle="Access Denied">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </Page>
    )
  }

  const handleInviteUser = async () => {
    if (!inviteForm.email || !inviteForm.fullName) {
      notifications.createError('Invite User', 'Please fill in all required fields')
      return
    }

    setIsInviting(true)

    try {
      // Call Supabase Auth Admin API to create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: inviteForm.email,
        email_confirm: true,
        user_metadata: {
          full_name: inviteForm.fullName
        }
      })

      if (authError) {
        notifications.createError('Invite User', authError.message)
        setIsInviting(false)
        return
      }

      // Create profile with role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: inviteForm.email,
          full_name: inviteForm.fullName,
          role: inviteForm.role,
          is_active: true
        })

      if (profileError) {
        notifications.createError('Invite User', profileError.message)
        setIsInviting(false)
        return
      }

      notifications.createSuccess('User Invited', `${inviteForm.fullName} has been invited successfully`)
      
      // Reset form
      setInviteForm({
        email: '',
        fullName: '',
        role: 'member'
      })
      
      // Close modal
      setIsInviteOpen(false)
      
      // Refresh users list
      refresh()
    } catch (error) {
      console.error('Error inviting user:', error)
      notifications.createError('Invite User', 'Failed to invite user')
    } finally {
      setIsInviting(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete user from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)

      if (authError) {
        notifications.createError('Delete User', authError.message)
        return
      }

      // Profile will be deleted via cascade
      notifications.createSuccess('User Deleted', `${userName} has been removed`)
      
      // Refresh users list
      refresh()
    } catch (error) {
      console.error('Error deleting user:', error)
      notifications.createError('Delete User', 'Failed to delete user')
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'manager' | 'member', userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        notifications.createError('Update Role', error.message)
        return
      }

      notifications.createSuccess('Role Updated', `${userName}'s role has been updated to ${newRole}`)
      
      // Refresh users list
      refresh()
    } catch (error) {
      console.error('Error updating role:', error)
      notifications.createError('Update Role', 'Failed to update user role')
    }
  }

  return (
    <Page title="Settings" subtitle="Manage system settings and users">
      <div className="space-y-6">
        {/* Users Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users
                </CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </div>
              <Button onClick={() => setIsInviteOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email Address</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-muted-foreground" />
                          {user.full_name || 'Unknown User'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: 'admin' | 'manager' | 'member') => 
                            handleUpdateRole(user.id, value, user.full_name)
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <Badge {...ROLE_BADGES.admin}>Admin</Badge>
                            </SelectItem>
                            <SelectItem value="manager">
                              <Badge {...ROLE_BADGES.manager}>Manager</Badge>
                            </SelectItem>
                            <SelectItem value="member">
                              <Badge {...ROLE_BADGES.member}>Member</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.full_name)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invite User Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user to join the platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={inviteForm.role} 
                onValueChange={(value: 'admin' | 'manager' | 'member') => 
                  setInviteForm({ ...inviteForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Member</span>
                      <span className="text-xs text-muted-foreground">Can log time and view assigned projects</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Manager</span>
                      <span className="text-xs text-muted-foreground">Can manage projects and view reports</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-muted-foreground">Full system access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsInviteOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleInviteUser}
              disabled={isInviting || !inviteForm.email || !inviteForm.fullName}
            >
              {isInviting ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}

