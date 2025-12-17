# How to Refresh Admin Role in UI

## ✅ Database Updated
Your user `gyorgy.herbszt@sonardigital.io` **IS** now an admin in the database.

## 🔄 The Issue
The UI is showing cached profile data from your current session.

## 🛠️ Quick Fix - Choose One:

### Option 1: Log Out & Log In (Recommended)
1. Click your profile in the sidebar
2. Click "Logout" or "Sign Out"
3. Log back in with your credentials
4. Your role will now show as "Admin"

### Option 2: Hard Refresh Browser
1. Press `Ctrl + Shift + R` (Windows/Linux)
2. Or `Cmd + Shift + R` (Mac)
3. This clears the cache and reloads

### Option 3: Clear Application Data
1. Open DevTools (`F12`)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Find "Local Storage" → Your domain
4. Delete the Supabase auth tokens
5. Refresh the page

## ✅ After Refresh
You should see:
- Your name tag showing "(Admin)" in the sidebar
- User selector dropdown on Timetable page
- "Invite Members" button on Project Details pages
- Role management options

---

**Recommended:** Just **log out and log back in** - it's the cleanest way! 🚀

