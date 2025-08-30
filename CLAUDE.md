# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack e-commerce platform with a React frontend and Express.js backend:

- **Backend** (`/backend`): Express.js API server with MongoDB database
  - Routes in `/backend/routes/` - API endpoints organized by feature
  - Models in `/backend/models/` - Mongoose schemas for MongoDB
  - Middleware in `/backend/middleware/` - Authentication, rate limiting, error handling
  - Socket.IO integration for real-time features (chat, notifications)
  
- **Frontend** (`/fontend`): React app with Vite build system
  - Pages in `/src/pages/` - Main application views
  - Components in `/src/components/` - Reusable UI components
  - Contexts in `/src/contexts/` - React context providers (Auth, Cart, Chat, etc.)
  - Utils in `/src/utils/` - API client, helpers, Firebase integration

## Development Commands

### Backend
```bash
cd backend
npm test                    # Run Jest tests
npm run seed:analytics      # Seed analytics packages
```

### Frontend
```bash
cd fontend
npm run dev                 # Start Vite dev server (port 5173)
npm run build               # Production build
npm run lint                # Run ESLint
npm run preview             # Preview production build
```

## Architecture Notes

### Real-time Features
- Socket.IO server configured in `backend/index.js` with JWT authentication
- Chat system with room management and typing indicators
- Real-time notifications system
- User presence tracking

### State Management
- React Context API for global state (AuthContext, CartContext, etc.)
- No external state management library (Redux/Zustand)

### Authentication
- JWT-based authentication with HTTP-only cookies
- Auth middleware in `backend/middleware/auth.js`
- Frontend auth state managed via AuthContext

### Database
- MongoDB with Mongoose ODM
- Models follow consistent naming (capitalized, singular)
- Environment variables required: `MONGO_URI`, `JWT_SECRET`

### Key Features
- Multi-vendor marketplace (stores, products, services)
- Booking system for services with time slots
- Wallet/payment system with transaction history
- Admin panel with analytics
- Social features (posts, comments, chat)
- Flash deals and promotional features
- NFC card customization

### Frontend Routing
- React Router with nested route structure
- Social feed (`/feed`) uses standalone layout without Header/Footer
- All other routes use main layout with Header/Footer
- 404 handling with NotFound component

### Styling
- Tailwind CSS with custom configuration
- Custom fonts: Inter, Playfair Display, Poppins, Crimson Text
- Mobile-responsive design

### Development Notes
- Backend serves frontend build in production (static files from `/dist`)
- CORS configured for multiple development origins
- Socket.IO and Express configured with same CORS origins
- Maintenance mode toggle available in App.jsx