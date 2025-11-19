# Relative Pointing App

A collaborative web app for Scrum teams to perform relative story pointing using a drag-and-drop interface.

## Features

- **Session-based collaboration**: Generate room codes for team sessions
- **CSV Import**: Upload Jira task exports
- **Relative Pointing**: Drag tasks into complexity columns
- **Dynamic Columns**: Create new columns by dropping between existing ones
- **Turn-based**: Rotate through team members
- **Real-time Chat**: Discuss tasks as you point
- **Bulk Export**: Open Jira tabs grouped by point value

## Tech Stack

- **Frontend**: React 18 with Hooks
- **Styling**: Tailwind CSS
- **Real-time Sync**: Firebase Realtime Database
- **Drag & Drop**: @dnd-kit/core
- **CSV Parsing**: PapaParse
- **Hosting**: AWS S3 + CloudFront

## Project Structure

```
relative-pointing-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── SessionCreator.jsx
│   │   ├── SessionJoin.jsx
│   │   ├── TaskBoard.jsx
│   │   ├── TaskCard.jsx
│   │   ├── Column.jsx
│   │   ├── CSVUploader.jsx
│   │   ├── Chat.jsx
│   │   ├── ParticipantList.jsx
│   │   └── SessionComplete.jsx
│   ├── services/
│   │   └── firebase.js
│   ├── hooks/
│   │   ├── useSession.js
│   │   ├── useChat.js
│   │   └── useTurnManager.js
│   ├── utils/
│   │   ├── csvParser.js
│   │   ├── roomCodeGenerator.js
│   │   └── jiraUrlBuilder.js
│   ├── App.jsx
│   └── index.js
├── docs/
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   ├── FIREBASE_SETUP.md
│   └── DEPLOYMENT.md
└── package.json
```

## Quick Start

See [SETUP.md](./docs/SETUP.md) for detailed setup instructions.

```bash
npm install
npm start
```

## Development Workflow

1. Set up Firebase project (see [FIREBASE_SETUP.md](./docs/FIREBASE_SETUP.md))
2. Configure environment variables
3. Run development server
4. Build and deploy to S3 (see [DEPLOYMENT.md](./docs/DEPLOYMENT.md))

## License

MIT
