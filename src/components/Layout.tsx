import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { 
  Home, 
  Clock, 
  Calendar, 
  FolderOpen,
  Timer,
  BarChart3,
  PieChart,
  Moon,
  LogOut,
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '../hooks/useAuth';
import { useSupabaseAppState } from '../hooks/useSupabaseAppState';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Time Tracking', href: '/time-tracking', icon: Timer },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Summary', href: '/summary', icon: PieChart },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { users } = useSupabaseAppState();
  
  // Get user profile from Supabase profiles table
  const userProfile = users.find(u => u.id === user?.id);
  const profileName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User';
  const userRole = userProfile?.role || 'user';
  
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
              {navigation.map((item) => {
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
    </div>
  );
};
