# Setup Instructions

Quick start guide for local development.

## Prerequisites

- Node.js 16+ and npm
- Git
- Code editor (VS Code recommended)
- Firebase account (see [FIREBASE_SETUP.md](FIREBASE_SETUP.md))

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd relative-pointing-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to:
1. Create Firebase project
2. Enable Realtime Database
3. Get configuration values

### 4. Set Environment Variables

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

### 5. Start Development Server

```bash
npm start
```

App opens at `http://localhost:3000`

## Development Workflow

### Testing Real-time Features

Open multiple browser tabs/windows to simulate multiple users:
1. Create session in first tab
2. Copy room code
3. Join from second tab with different username
4. Test real-time synchronization

### Sample Jira CSV

Create `sample-tasks.csv` for testing:

```csv
Issue Key,Summary,Issue Type,Status,Priority
PROJ-123,Implement user authentication,Story,To Do,High
PROJ-124,Design homepage mockup,Story,To Do,Medium
PROJ-125,Set up CI/CD pipeline,Task,To Do,High
PROJ-126,Write API documentation,Task,To Do,Low
PROJ-127,Add error logging,Story,To Do,Medium
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Build for Production

```bash
npm run build
```

Creates optimized build in `build/` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── SessionCreator.jsx
│   ├── TaskBoard.jsx
│   └── ...
├── services/           # External services
│   └── firebase.js
├── hooks/              # Custom React hooks
│   ├── useSession.js
│   └── ...
├── utils/              # Helper functions
│   ├── csvParser.js
│   └── ...
├── App.jsx             # Main app component
└── index.js            # Entry point
```

## Common Issues

### Firebase Connection Errors

**Problem**: "Permission denied" or connection refused

**Solution**:
- Verify `.env.local` values are correct
- Check Firebase security rules
- Ensure Realtime Database is enabled

### Port Already in Use

**Problem**: "Port 3000 is already in use"

**Solution**:
```bash
# Find process using port
lsof -ti:3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Module Not Found

**Problem**: "Cannot find module 'X'"

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## VS Code Recommended Extensions

- ESLint
- Prettier
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Firebase (Syntax highlighting)

## VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add: your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase API key | Yes |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `REACT_APP_FIREBASE_DATABASE_URL` | Realtime Database URL | Yes |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | Yes |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID | Yes |

## Useful Commands

```bash
# Install new package
npm install <package-name>

# Update packages
npm update

# Check for outdated packages
npm outdated

# Clean install
npm ci

# Run specific test file
npm test -- TaskBoard.test.js

# Build and serve locally
npm run build && npx serve -s build
```

## Debugging

### React Developer Tools

Install browser extension:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Firebase Debugging

View data in Firebase Console:
1. Go to Realtime Database
2. Click "Data" tab
3. Expand sessions node

### Network Debugging

Check WebSocket connection:
1. Open browser DevTools
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Look for Firebase connections

## Next Steps

1. Complete Firebase setup
2. Run app locally
3. Test with sample CSV
4. Build first feature
5. Deploy to staging environment

## Getting Help

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for Firebase issues
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for deployment questions
- Open GitHub issue for bugs or feature requests

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

See CONTRIBUTING.md for detailed guidelines.
