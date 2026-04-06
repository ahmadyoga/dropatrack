---
description: How to start the dev server and verify changes locally
---

# Dev Workflow

// turbo-all

1. Make sure you're using Node 22:
```bash
nvm use
```

2. Install dependencies (if needed):
```bash
npm install
```

3. Start the dev server:
```bash
npm run dev
```

4. Open `http://localhost:3000` in the browser to verify.

5. To test a specific room, navigate to `http://localhost:3000/{slug}` (e.g. `/test-room`). 
   If the room doesn't exist, it will be auto-created.

6. To verify build passes before deploying:
```bash
npm run build
```
