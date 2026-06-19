# MORIS Frontend

Frontend foundation for MORIS - Ministry of Revenue Integrated System.

This project follows the same Vite/React foundation used by the TasMel HR frontend. It currently has no visible UI and no business screens.

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Environment

Set the backend URL when the backend environment is ready:

```bash
VITE_API_BASE_URL=http://localhost:10000
```

Production Render value:

```bash
VITE_API_BASE_URL=https://tasmel-moris-backend.onrender.com
```

## Core Shell

The frontend now includes:

- staff login
- protected workspace routes
- responsive desktop and mobile navigation
- system readiness dashboard
- security summary dashboard
- account password change
- API session refresh through the backend refresh cookie
