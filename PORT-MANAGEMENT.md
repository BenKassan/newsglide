# Port Management Guide

## Overview

This document explains the port configuration for NewsGlide and provides solutions to common port-related issues.

## Current Configuration

**Active Project:** `/Users/elliotgreenbaum/NewsGlide Sep 2025`
**Dev Server Port:** `3000` (configured in `vite.config.ts`)
**Strict Port Mode:** Enabled (prevents auto-incrementing to other ports)

## Quick Commands

```bash
# Start dev server (standard)
npm run dev

# Start dev server after killing any existing processes
npm run dev:clean

# Check which ports are in use
npm run ports:check

# Kill all processes on dev ports
npm run ports:kill

# Kill only Vite dev servers
npm run ports:clean

# Show all NewsGlide project directories
npm run ports:projects
```

## Common Port Issues & Solutions

### Issue 1: "Port 3000 is already in use"

**Cause:** Another dev server or application is using port 3000.

**Solution:**
```bash
npm run dev:clean
```

This will kill all processes on common dev ports and start fresh.

### Issue 2: Changes not appearing in browser

**Cause:** You're viewing a different project's dev server.

**Solution:**
1. Check which directory you're in:
   ```bash
   pwd
   ```
2. Make sure it's `/Users/elliotgreenbaum/NewsGlide Sep 2025`
3. Kill all dev servers and restart:
   ```bash
   npm run dev:clean
   ```

### Issue 3: Multiple servers running on different ports

**Cause:** Multiple NewsGlide project directories with servers running.

**Solution:**
```bash
# See all ports in use
npm run ports:check

# Kill all dev servers
npm run ports:kill

# See which NewsGlide directories exist
npm run ports:projects
```

## Project Directory Status

### ✅ Active (Use This One)
- **Path:** `/Users/elliotgreenbaum/NewsGlide Sep 2025`
- **Port:** `3000`
- **Status:** Primary development directory

### ⚠️ Legacy (Do Not Use)
- **Path:** `/Users/elliotgreenbaum/Newsglide`
- **Port:** `8080`
- **Status:** Old version - may cause confusion

### ❌ Inactive (Do Not Use)
- `/Users/elliotgreenbaum/NewsGlide Rebuilt`
- `/Users/elliotgreenbaum/Downloads/NewsGlide Cursor:CC`

## Port Management Script

The `scripts/port-manager.sh` script provides detailed port management:

```bash
# Direct script usage
./scripts/port-manager.sh check      # Check port status
./scripts/port-manager.sh kill       # Kill all dev ports
./scripts/port-manager.sh clean      # Kill Vite servers
./scripts/port-manager.sh projects   # Show project directories
./scripts/port-manager.sh help       # Show help
```

## Vite Configuration

The dev server is configured in `vite.config.ts`:

```typescript
server: {
  host: '::',           // Listen on all interfaces
  port: 3000,          // Fixed port (no auto-increment)
  strictPort: true,    // Fail if port is busy (don't auto-increment)
  open: true,          // Auto-open browser
}
```

**Key Settings:**
- `strictPort: true` - Prevents Vite from automatically using a different port if 3000 is busy
- `open: true` - Automatically opens your browser to the correct URL

## Monitored Ports

The port manager monitors these common development ports:
- `3000` - NewsGlide dev server (current)
- `5173` - Vite default port
- `8080` - Old NewsGlide port
- `8081` - Previous NewsGlide port
- `4173` - Vite preview port
- `5174` - Alternative Vite port

## Best Practices

1. **Always use the correct directory:**
   ```bash
   cd "/Users/elliotgreenbaum/NewsGlide Sep 2025"
   ```

2. **Before starting work:**
   ```bash
   npm run ports:check
   npm run dev:clean
   ```

3. **If changes don't appear:**
   - Verify you're in the correct directory
   - Check the browser URL is `http://localhost:3000`
   - Kill all servers and restart

4. **Keep only one project active:**
   - Don't run dev servers from multiple NewsGlide directories
   - Use `npm run ports:projects` to see all directories

## Troubleshooting

### Can't kill processes?

Try using the script with verbose output:
```bash
./scripts/port-manager.sh kill
```

Or manually:
```bash
lsof -ti :3000 | xargs kill -9
```

### Script permission denied?

Make the script executable:
```bash
chmod +x scripts/port-manager.sh
```

### Still seeing wrong port?

1. Kill ALL node processes:
   ```bash
   pkill -f node
   ```

2. Restart from the correct directory:
   ```bash
   cd "/Users/elliotgreenbaum/NewsGlide Sep 2025"
   npm run dev:clean
   ```

## Additional Resources

- [Vite Server Options](https://vitejs.dev/config/server-options.html)
- [Node.js Port Management](https://nodejs.org/api/net.html)

---

**Last Updated:** 2025-01-10
**Maintainer:** NewsGlide Development Team
