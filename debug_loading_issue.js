// Debug script to identify loading issues
// Add this temporarily to your browser console to debug

console.log('🔍 Debugging loading issue...');

// Check if user is authenticated
const checkAuth = () => {
  console.log('📋 Checking authentication state...');
  
  // Check localStorage for auth tokens
  const authKeys = [
    'supabase.auth.token',
    'sb-auth-token',
    'supabase-auth-token'
  ];
  
  authKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`🔑 ${key}:`, value ? 'Present' : 'Not found');
  });
  
  // Check cookies
  console.log('🍪 Cookies:', document.cookie);
  
  // Check if Supabase client exists
  if (window.supabase) {
    console.log('✅ Supabase client found');
    
    // Check current session
    window.supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Session error:', error);
      } else {
        console.log('👤 Current session:', data.session ? 'Active' : 'None');
        if (data.session) {
          console.log('📧 User email:', data.session.user.email);
        }
      }
    });
  } else {
    console.log('❌ Supabase client not found');
  }
};

// Check network requests
const checkNetworkRequests = () => {
  console.log('🌐 Monitoring network requests...');
  
  // Override fetch to log requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('🔗 Fetch request:', args[0]);
    return originalFetch.apply(this, args)
      .then(response => {
        console.log('📡 Response status:', response.status, 'for', args[0]);
        if (!response.ok) {
          console.error('❌ Failed request:', args[0], response.status, response.statusText);
        }
        return response;
      })
      .catch(error => {
        console.error('💥 Network error:', error, 'for', args[0]);
        throw error;
      });
  };
};

// Test Supabase connection
const testSupabaseConnection = async () => {
  console.log('🧪 Testing Supabase connection...');
  
  if (!window.supabase) {
    console.error('❌ Supabase client not available');
    return;
  }
  
  try {
    // Test profiles table
    console.log('🔍 Testing profiles table...');
    const { data: profiles, error: profileError } = await window.supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.error('❌ Profiles error:', profileError);
    } else {
      console.log('✅ Profiles accessible:', profiles?.length || 0, 'records');
    }
    
    // Test clients table
    console.log('🔍 Testing clients table...');
    const { data: clients, error: clientError } = await window.supabase
      .from('clients')
      .select('*')
      .limit(1);
    
    if (clientError) {
      console.error('❌ Clients error:', clientError);
    } else {
      console.log('✅ Clients accessible:', clients?.length || 0, 'records');
    }
    
    // Test projects table
    console.log('🔍 Testing projects table...');
    const { data: projects, error: projectError } = await window.supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (projectError) {
      console.error('❌ Projects error:', projectError);
    } else {
      console.log('✅ Projects accessible:', projects?.length || 0, 'records');
    }
    
  } catch (error) {
    console.error('💥 Connection test failed:', error);
  }
};

// Run all checks
checkAuth();
checkNetworkRequests();

// Test connection after a brief delay to allow for auth initialization
setTimeout(testSupabaseConnection, 2000);

console.log('🎯 Debug script loaded. Check console for results.');
console.log('💡 To manually test Supabase connection, run: testSupabaseConnection()');
