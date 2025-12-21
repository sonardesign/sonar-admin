import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  Home, 
  Clock, 
  CalendarDays,
  FolderOpen,
  Timer,
  BarChart3,
  PieChart,
  Moon,
  LogOut,
  ChevronUp,
  Settings,
  Users
} from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../hooks/useAuth';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';
import { usePermissions } from '../hooks/usePermissions';
import { notifications } from '../lib/notifications';
import { isRouteAllowed } from '../lib/permissions';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Time Tracking', href: '/time-tracking', icon: Timer },
  { name: 'Timetable', href: '/timetable', icon: CalendarDays },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Forecast', href: '/workload', icon: Users },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Summary', href: '/summary', icon: PieChart },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { users } = useSupabaseAppState();
  const { userRole } = usePermissions();
  
  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    userName: '',
    dateFormat: 'MM/DD/YYYY',
    workweekStart: 'monday',
    currency: 'USD'
  });
  
  // Get user profile from Supabase profiles table
  const userProfile = users.find(u => u.id === user?.id);
  const profileName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User';
  
  // Filter navigation items based on user permissions
  const filteredNavigation = useMemo(() => {
    return navigation.filter(item => isRouteAllowed(item.href, userRole));
  }, [userRole]);
  
  // Generate proper initials from the full name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0].toUpperCase())
      .slice(0, 2) // Take only first 2 initials
      .join('');
  };
  
  const handleDarkModeToggle = () => {
    // TODO: Implement dark mode toggle
    console.log('Dark mode toggle clicked - not implemented yet');
  };
  
  const handleOpenSettings = () => {
    // Initialize form with current user data
    setSettingsForm({
      userName: profileName,
      dateFormat: 'MM/DD/YYYY', // TODO: Get from user preferences
      workweekStart: 'monday', // TODO: Get from user preferences
      currency: 'USD' // TODO: Get from user preferences
    });
    setIsSettingsOpen(true);
  };
  
  const handleSaveSettings = async () => {
    try {
      // TODO: Save settings to database
      console.log('Saving settings:', settingsForm);
      notifications.createSuccess('Settings', 'Preferences updated');
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      notifications.createError('Settings', error instanceof Error ? error.message : 'Unknown error');
    }
  };
  
  const handleCancelSettings = () => {
    setIsSettingsOpen(false);
  };
  
  const handleLogout = async () => {
    console.log('🚪 Logout clicked');
    try {
      const { error } = await signOut();
      if (error) {
        console.error('❌ Logout error:', error);
      }
    } catch (error) {
      console.error('💥 Logout exception:', error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Sonar Admin</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Profile Section */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-2 h-auto hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={profileName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(profileName)}
                      </AvatarFallback>
                    </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{profileName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                        </div>
                  </div>
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="top" 
                className="w-56 mb-2"
                sideOffset={8}
              >
                <DropdownMenuItem onClick={handleOpenSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDarkModeToggle}>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark Mode
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your account preferences and application settings.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto space-y-6 py-4 px-4">
            {/* User Name Section */}
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-sm font-medium">
                User Name
              </Label>
              <Input
                id="userName"
                value={settingsForm.userName}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, userName: e.target.value }))}
                placeholder="Enter your name"
              />
            </div>

            {/* Data Format Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Data Format</h3>
              
              {/* Workweek Start */}
              <div className="space-y-2">
                <Label htmlFor="workweekStart" className="text-sm">
                  Calendar view - workweek starts
                </Label>
                <Select
                  value={settingsForm.workweekStart}
                  onValueChange={(value) => setSettingsForm(prev => ({ ...prev, workweekStart: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Format */}
              <div className="space-y-2">
                <Label htmlFor="dateFormat" className="text-sm">
                  Select date format
                </Label>
                <Select
                  value={settingsForm.dateFormat}
                  onValueChange={(value) => setSettingsForm(prev => ({ ...prev, dateFormat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY/MM/DD">YYYY/MM/DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Currency Section */}
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium">
                Currency
              </Label>
              <Select
                value={settingsForm.currency}
                onValueChange={(value) => setSettingsForm(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelSettings}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
