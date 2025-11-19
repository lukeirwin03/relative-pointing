# Getting Started - Quick Setup

This is the fastest way to get the Relative Pointing App running.

## Prerequisites

You need **Node.js 18+** installed. Download from: https://nodejs.org/

That's it! Everything else is automated.

## Quick Start (2 minutes)

### macOS / Linux

```bash
./run
```

### Windows

```bash
run.bat
```

That's it! The script will:
1. ✅ Check Node.js and npm
2. ✅ Install dependencies
3. ✅ Set up environment variables
4. ✅ Start the development server

## First Time Setup

When you run the script for the first time:

1. It will create `.env.local` from the template
2. You'll need to add your **Firebase credentials**
3. Follow the on-screen instructions

### Getting Firebase Credentials (2 minutes)

1. Go to https://console.firebase.google.com
2. Click "Create Project" (or select existing)
3. Enable "Realtime Database"
   - Start in "Test Mode" (for development)
4. Go to **Project Settings** (gear icon) → **Service Accounts** → **Web**
5. Copy the config values into `.env.local`:

```
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Detailed Firebase Setup

For step-by-step Firebase setup, see: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

## Running the App

### Start Development Server

```bash
# macOS / Linux
./run

# Windows
run.bat
```

Opens at `http://localhost:3000`

### Other Commands

```bash
# Run tests
npm test

# Build for production
npm run build

# Format code
npm run format

# Check for lint errors
npm run lint
```

## Testing the App

Once running, try this flow:

1. **Create a Session**
   - Click "Create Session"
   - Get a room code (e.g., "A3X9K2")

2. **Join from Another Tab**
   - Open a new tab: `http://localhost:3000`
   - Click "Join Session"
   - Enter the room code
   - Use different username

3. **Upload Sample Data**
   - Use the included `sample-tasks.csv`
   - Or create your own

4. **Test Real-time Sync**
   - Drag tasks in one tab
   - See them update in the other tab instantly

## Troubleshooting

### "Port 3000 already in use"

The port is taken by another process. Solutions:

```bash
# Use a different port
PORT=3001 npm start

# Or kill the process using port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### "Permission denied" when running ./run

Make the script executable:

```bash
chmod +x run
./run
```

### Firebase connection errors

Check:
1. `.env.local` values are correct
2. Firebase project exists and is active
3. Realtime Database is enabled
4. Security rules allow read/write (test mode does)

See: [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)

### "Cannot find module" errors

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
./run
```

## What the Scripts Do

### `run` (macOS/Linux)

The bash script automatically:
- Checks Node.js version (18+)
- Validates npm is installed
- Creates `.env.local` if missing
- Installs dependencies if needed
- Validates Firebase credentials
- Starts the dev server on port 3000
- Shows helpful error messages

### `run.bat` (Windows)

Same as above, but for Windows Command Prompt.

### `.nvmrc`

Specifies Node version (18.17.1) for nvm users.
If you use nvm: `nvm use` before running the script.

## Project Structure

```
relative-pointing-app/
├── run                    ← Linux/macOS launcher
├── run.bat               ← Windows launcher
├── .nvmrc                ← Node version specification
├── .env.example          ← Environment template
├── .env.local            ← Your Firebase config (created by script)
├── package.json          ← Dependencies
├── src/                  ← React source code
├── docs/                 ← Full documentation
└── sample-tasks.csv      ← Test data
```

## Need Help?

1. **Setup issues?** → Read [docs/SETUP.md](docs/SETUP.md)
2. **Firebase problems?** → Read [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)
3. **Architecture questions?** → Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
4. **Development help?** → Read [CLAUDE_CODE_GUIDE.md](CLAUDE_CODE_GUIDE.md)
5. **Quick reference?** → Read [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

## Tech Stack

- **React 18** - UI framework
- **Firebase Realtime Database** - Backend
- **Tailwind CSS** - Styling
- **@dnd-kit** - Drag and drop
- **React Router** - Navigation
- **PapaParse** - CSV parsing

## Next Steps

1. ✅ Run the app: `./run` (or `run.bat`)
2. ✅ Create a test session
3. ✅ Upload sample CSV
4. ✅ Test multi-user with 2 browser tabs
5. 📚 Read [CLAUDE_CODE_GUIDE.md](CLAUDE_CODE_GUIDE.md) for development

---

**That's it!** You're ready to build. Just run `./run` and start developing! 🚀
