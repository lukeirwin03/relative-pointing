# Firebase Setup Guide

## Prerequisites

- Google account
- Node.js installed locally

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `relative-pointing-app`
4. Disable Google Analytics (optional for this app)
5. Click "Create project"

## Step 2: Register Web App

1. In Firebase console, click the web icon `</>`
2. Register app nickname: `relative-pointing-web`
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object

## Step 3: Enable Realtime Database

1. In Firebase console, go to "Build" → "Realtime Database"
2. Click "Create Database"
3. Choose location closest to your users
4. Start in **test mode** (we'll add security rules later)
5. Click "Enable"

## Step 4: Configure Security Rules

Replace the default rules with:

```json
{
  "rules": {
    "sessions": {
      "$roomCode": {
        ".read": "auth != null || data.child('participants').hasChild(auth.uid)",
        ".write": "auth != null || data.child('participants').hasChild(auth.uid)",
        
        "metadata": {
          ".write": "!data.exists() || data.child('createdBy').val() === auth.uid"
        },
        
        "participants": {
          "$userId": {
            ".write": "$userId === auth.uid"
          }
        },
        
        "tasks": {
          ".write": "root.child('sessions').child($roomCode).child('currentTurn').val() === auth.uid || root.child('sessions').child($roomCode).child('metadata/createdBy').val() === auth.uid"
        },
        
        "chat": {
          ".read": true,
          "$messageId": {
            ".write": "!data.exists() && newData.child('userId').val() === auth.uid"
          }
        }
      }
    }
  }
}
```

**Note:** For MVP, you can use simpler rules:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **Warning:** Open rules are insecure. Use only for development!

## Step 5: Create Environment Variables

Create `.env.local` in project root:

```bash
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

## Step 6: Install Firebase SDK

```bash
npm install firebase
```

## Step 7: Initialize Firebase in App

See `src/services/firebase.js` for implementation.

## Optional: Enable Authentication

If you want proper user authentication:

1. Go to "Build" → "Authentication"
2. Click "Get started"
3. Enable "Anonymous" provider (simplest)
4. Or enable "Email/Password" or "Google" sign-in

For this app, **anonymous auth** is sufficient:
- Users don't need accounts
- Each session creates temporary identity
- No password management needed

## Testing Firebase Connection

```javascript
// Quick test in browser console
import { ref, set, onValue } from 'firebase/database';
import { database } from './services/firebase';

// Write test
const testRef = ref(database, 'test');
set(testRef, { message: 'Hello Firebase!' });

// Read test
onValue(testRef, (snapshot) => {
  console.log(snapshot.val());
});
```

## Free Tier Limits

Firebase Realtime Database free tier includes:
- **1 GB stored data**
- **10 GB/month downloaded**
- **100 simultaneous connections**

This is plenty for:
- ~100 sessions per month
- ~20 simultaneous users
- ~1000 tasks per session

## Monitoring Usage

1. Go to "Build" → "Realtime Database"
2. Click "Usage" tab
3. Monitor storage and bandwidth
4. Set up alerts for approaching limits

## Cleanup Old Sessions

To avoid hitting storage limits, implement cleanup:

```javascript
// Run this periodically or on session complete
const sessionsRef = ref(database, 'sessions');
const oldSessions = query(
  sessionsRef,
  orderByChild('metadata/createdAt'),
  endAt(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
);

// Delete old sessions
onValue(oldSessions, (snapshot) => {
  snapshot.forEach((child) => {
    remove(child.ref);
  });
}, { onlyOnce: true });
```

## Troubleshooting

### "Permission denied" errors
- Check security rules
- Verify user is authenticated (if using auth)
- Check Firebase console for rule simulation

### Connection issues
- Verify DATABASE_URL in .env
- Check network/firewall settings
- Look for CORS errors in console

### Data not syncing
- Check Firebase console "Data" tab
- Verify listeners are attached
- Check for JavaScript errors

## Production Considerations

1. **Tighten security rules** - remove test mode
2. **Enable authentication** - at minimum anonymous auth
3. **Set up indexes** - for better query performance
4. **Monitor usage** - set up billing alerts
5. **Backup data** - export important sessions

## Next Steps

After Firebase is configured:
1. Test connection with simple read/write
2. Implement session creation
3. Test real-time sync with multiple browser tabs
4. Build out remaining features
