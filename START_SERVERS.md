# How to Start the Servers

## Quick Start

You need to run **both** the backend and frontend servers for the app to work.

### Option 1: Run Both Servers Together (Recommended)

From the **root directory** (`vizzo-check/`):

```bash
bun run dev
```

This will start both:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:3000`

### Option 2: Run Servers Separately

**Terminal 1 - Backend:**
```bash
cd backend
bun run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
bun run dev
```

## Verify Servers Are Running

### Check Backend
Open in browser or use curl:
```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Check Frontend
Open in browser:
```
http://localhost:3000
```

## Troubleshooting

### Backend won't start

1. **Check if port 3001 is already in use:**
   ```bash
   lsof -i :3001
   ```
   If something is using it, kill it or change the port in `backend/.env`

2. **Check environment variables:**
   Make sure `backend/.env` exists and has:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`

3. **Check dependencies:**
   ```bash
   cd backend
   bun install
   ```

4. **Check for errors:**
   Look at the terminal output when starting the backend for any error messages

### Frontend can't connect to backend

1. **Verify backend is running:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check frontend environment:**
   Make sure `frontend/.env` has:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. **Restart frontend** after changing `.env` files

### Common Errors

**"Connection refused"**
- Backend is not running
- Start it with `cd backend && bun run dev`

**"Port already in use"**
- Another process is using the port
- Kill it: `lsof -ti:3001 | xargs kill -9`
- Or change the port in `.env`

**"Module not found"**
- Dependencies not installed
- Run: `bun install` in the root directory

## Development Workflow

1. **First time setup:**
   ```bash
   # Install all dependencies
   bun install
   
   # Set up environment variables
   # Copy .env.example files and fill them in
   
   # Start both servers
   bun run dev
   ```

2. **Daily development:**
   ```bash
   # Just start the servers
   bun run dev
   ```

3. **If something breaks:**
   ```bash
   # Stop servers (Ctrl+C)
   # Clear caches
   cd frontend && rm -rf .next
   cd backend && rm -rf dist
   
   # Restart
   bun run dev
   ```
