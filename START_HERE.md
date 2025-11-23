# 🚀 START HERE

Welcome to the Relative Pointing App! A collaborative web application for Scrum teams to perform relative story pointing.

## What You Have

✅ **Fully Functional App** - Ready to use for team story pointing  
✅ **No External Dependencies** - Everything runs locally  
✅ **Clean Code** - Well-organized React + Express  
✅ **Security Built-In** - Rate limiting and input validation  
✅ **Documentation** - Everything is documented  

## Quick Start (2 minutes)

```bash
./run
```

That's it! The script will:
- Check Node.js (18+)
- Install dependencies
- Start backend (port 5000)
- Start frontend (port 3000)

App opens at **http://localhost:3000**

## First Test

1. **Create a Session**
   - Enter your name
   - Click "Create Session"
   - Copy the room code

2. **Join from Another Tab**
   - Open incognito/private window
   - Go to http://localhost:3000
   - Click "Join Session"
   - Enter your name + room code
   - Click "Join"

3. **See Both Participants**
   - Both tabs show 2 avatars in top-right corner
   - Participants are in real-time sync

## What's Built

✅ **Session Management** - Create and join with room codes  
✅ **Participant List** - See all team members in real-time  
✅ **CSV Import** - Upload Jira task exports  
✅ **Drag & Drop** - Move tasks between complexity columns  
✅ **Dynamic Columns** - Create columns by dragging  
✅ **Dark Mode** - Light and dark themes  
✅ **Security** - Rate limiting + input validation  

## Architecture

```
Frontend (React) ←→ Backend (Express) ←→ Database (SQLite)
Port 3000           Port 5000            app.db
```

No Firebase, no external services, everything local!

## File Structure

```
relative-pointing-app/
├── run                    ← RUN THIS
├── src/                   ← React code
│   ├── components/
│   ├── hooks/
│   ├── services/api.js
│   └── ...
├── server/                ← Express code
│   ├── server.js
│   ├── routes/
│   └── schema.sql
└── docs/
```

## Key Files

| File | What It Does |
|------|--------------|
| `./run` | Starts everything |
| `src/App.jsx` | Main React app |
| `src/services/api.js` | API communication |
| `server/server.js` | Express backend |
| `server/schema.sql` | Database design |

## Commands

```bash
./run                           # Start everything (recommended)
npm run dev                     # Alternative: start both
npm run start:backend           # Just backend
npm start                       # Just frontend
npm test                        # Run tests
npm run build                   # Build for production
```

## Common Tasks

### Reset Database
```bash
rm server/app.db
./run
```

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9   # Frontend
lsof -ti:5000 | xargs kill -9   # Backend
```

### Check Backend Status
```bash
curl http://localhost:5000/api/health
```

## Documentation

| Document | For |
|----------|-----|
| [README.md](README.md) | Project overview |
| [GETTING_STARTED.md](GETTING_STARTED.md) | Quick setup |
| [LOCAL_SETUP.md](LOCAL_SETUP.md) | Architecture deep-dive |
| [SECURITY.md](SECURITY.md) | Security details |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | What's built |
| [INDEX.md](INDEX.md) | All docs |

## Features

### Create a Session
1. Enter your name
2. Click "Create Session"
3. Get a unique room code

### Join a Session
1. Click "Join Session"
2. Enter your name + room code
3. See all participants immediately

### Upload Tasks
- Drag CSV files onto the page
- Or use manual task creation
- Tasks appear in right sidebar

### Point Stories
- Drag tasks from sidebar to columns
- Create new columns by dragging
- See updates in real-time

### Manage Tasks
- Delete tasks with button
- View task details
- Quick task creation modal

## Tech Stack

- **React 18** - UI framework
- **Tailwind CSS** - Styling
- **@dnd-kit** - Drag & drop
- **Express.js** - Backend API
- **SQLite** - Database
- **React Router** - Navigation

## Next Steps

1. ✅ Run `./run`
2. ✅ Create a session
3. ✅ Join from another tab
4. ✅ Upload sample tasks
5. ✅ Drag tasks around
6. 📚 Read [LOCAL_SETUP.md](LOCAL_SETUP.md) to understand more
7. 🚀 Deploy when ready

## Deployment

When ready to go to production:

1. Build React: `npm run build`
2. Deploy backend Express app
3. Switch from SQLite to PostgreSQL
4. Deploy frontend to S3/CloudFront
5. Update API URL in environment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for details.

## Need Help?

- **Setup issues?** → [GETTING_STARTED.md](GETTING_STARTED.md)
- **How it works?** → [LOCAL_SETUP.md](LOCAL_SETUP.md)
- **Architecture?** → Check `server/schema.sql` and `src/App.jsx`
- **Code questions?** → Check inline comments
- **Security?** → [SECURITY.md](SECURITY.md)

## Key Points

✨ **No Firebase** - Everything local  
✨ **No Configuration** - Just run `./run`  
✨ **No Authentication** - Perfect for local teams  
✨ **No Limits** - SQLite can handle team sessions  
✨ **Production Ready** - Clean architecture for scaling  

## Cost

**$0** - Runs entirely on your machine  
**Scales Free** - Deploy to free tier services  

## Status

🟢 **Ready to Use** - All core features implemented  
🟢 **Fully Tested** - Multi-user sessions work  
🟢 **Production Ready** - Can be deployed  

---

**That's all you need to know. Just run `./run` and start using it!** 🚀

Questions? Everything is documented. Just read the other guides!
