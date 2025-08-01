# Technical Context: XRPL Multi-Sign Manager
*Version: 1.0*
*Created: 2025-01-27*
*Last Updated: 2025-01-27*

## Technology Stack

### Frontend
- **React 18**: Modern UI framework for building interactive user interfaces
- **TypeScript 5.3**: Type-safe development with enhanced developer experience
- **Vite 5.0**: Fast build tool and development server
- **Tailwind CSS 3.3**: Utility-first CSS framework for rapid UI development
- **Zustand 4.4**: Lightweight state management library
- **React Router DOM 6.20**: Client-side routing for single-page applications
- **React Query 3.39**: Data fetching and caching library
- **Socket.io Client 4.7**: Real-time bidirectional communication
- **React Hook Form 7.48**: Performant forms with minimal re-renders
- **Headless UI 1.7**: Unstyled, accessible UI components
- **Heroicons 2.0**: Beautiful hand-crafted SVG icons
- **Lucide React 0.294**: Modern icon library

### Backend
- **Node.js 18+**: Server-side JavaScript runtime
- **Express.js 4.18**: Fast, unopinionated web framework
- **TypeScript 5.2**: Type-safe server-side development
- **Sequelize 6.35**: Promise-based Node.js ORM for PostgreSQL
- **JWT 9.0**: JSON Web Tokens for authentication and authorization
- **Passport.js 0.7**: Authentication middleware with multiple strategies
- **Socket.io 4.7**: Real-time bidirectional communication
- **Winston 3.11**: Logging library for Node.js
- **XRPL 2.14**: Official XRP Ledger JavaScript/TypeScript library
- **Redis 4.6**: In-memory data structure store for caching and sessions
- **Nodemailer 6.9**: Email sending library
- **Multer 1.4**: Middleware for handling multipart/form-data

### Database
- **PostgreSQL 15**: Advanced open-source relational database
- **Redis 7**: In-memory data structure store for caching and sessions
- **Sequelize CLI 6.6**: Database migration and seeding tools

### Infrastructure
- **Docker**: Containerization platform for consistent deployments
- **Docker Compose**: Multi-container Docker applications
- **pgAdmin 4**: Web-based PostgreSQL administration tool
- **Redis Commander**: Web interface for Redis management

### Development Tools
- **ESLint 8.54**: JavaScript/TypeScript linting utility
- **Prettier 3.1**: Code formatter for consistent code style
- **Jest 29.7**: JavaScript testing framework
- **Vitest 1.0**: Fast unit test framework for Vite
- **Nodemon 3.0**: Development server with auto-restart
- **TypeScript Compiler**: Static type checking and compilation

## Development Environment Setup

### Prerequisites
- Node.js 18+ and npm 8+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose

### Local Development Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/naory/xrpl-multi-sign-manager.git
   cd xrpl-multi-sign-manager
   npm run install:all
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development Environment**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d
   
   # Or using local services
   npm run dev
   ```

4. **Database Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Access Development Services**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health
   - API Documentation: http://localhost:3001/docs
   - Database Management (pgAdmin): http://localhost:5050
   - Redis Management: http://localhost:8081

### Development Commands

```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev                    # Both frontend and backend
npm run dev:frontend          # Frontend only
npm run dev:backend           # Backend only

# Testing
npm run test                  # Run all tests
npm run test:backend          # Backend tests only
npm run test:frontend         # Frontend tests only
npm run test:coverage         # Test coverage

# Building
npm run build                 # Build both frontend and backend
npm run build:frontend        # Frontend build only
npm run build:backend         # Backend build only

# Linting and Formatting
npm run lint                  # Lint all code
npm run lint:fix              # Fix linting issues
npm run type-check            # TypeScript type checking

# Database Operations
npm run db:migrate            # Run database migrations
npm run db:seed               # Seed database with test data

# Docker Operations
npm run docker:build          # Build Docker images
npm run docker:up             # Start Docker services
npm run docker:down           # Stop Docker services
npm run docker:logs           # View Docker logs

# Cleanup
npm run clean                 # Clean build artifacts
```

## Dependencies

### Core Backend Dependencies
- **express**: Web application framework
- **sequelize**: Database ORM for PostgreSQL
- **xrpl**: XRP Ledger JavaScript library
- **socket.io**: Real-time communication
- **jsonwebtoken**: JWT authentication
- **passport**: Authentication middleware
- **bcrypt**: Password hashing
- **redis**: Caching and session storage
- **winston**: Logging
- **helmet**: Security middleware
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting
- **express-validator**: Request validation
- **nodemailer**: Email sending
- **qrcode**: QR code generation
- **totp-generator**: TOTP for MFA

### Core Frontend Dependencies
- **react**: UI library
- **react-dom**: React DOM rendering
- **react-router-dom**: Client-side routing
- **zustand**: State management
- **react-query**: Data fetching and caching
- **axios**: HTTP client
- **socket.io-client**: Real-time communication
- **react-hook-form**: Form handling
- **tailwindcss**: CSS framework
- **headlessui**: Unstyled UI components
- **heroicons**: Icon library
- **react-hot-toast**: Toast notifications
- **recharts**: Chart library
- **date-fns**: Date manipulation
- **otplib**: TOTP for MFA
- **qrcode.react**: QR code display

### Development Dependencies
- **typescript**: Type checking and compilation
- **eslint**: Code linting
- **prettier**: Code formatting
- **jest**: Testing framework
- **vitest**: Fast testing for Vite
- **nodemon**: Development server
- **@types/***: TypeScript type definitions

## Technical Constraints

### Performance Requirements
- **API Response Time**: < 200ms for 95th percentile
- **Page Load Time**: < 2 seconds for initial load
- **Real-time Updates**: < 500ms for WebSocket messages
- **Database Queries**: < 100ms for 95th percentile

### Scalability Requirements
- **Concurrent Users**: 10,000+ simultaneous users
- **Transactions per Second**: 1,000+ TPS
- **Database Connections**: 1,000+ concurrent connections
- **Storage Capacity**: 1TB+ data storage

### Security Requirements
- **Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
- **Authentication**: Multi-factor authentication (TOTP, SMS, hardware keys)
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: Secure session handling with Redis
- **Rate Limiting**: Protection against abuse and attacks

### Availability Requirements
- **Uptime**: 99.9% availability (8.76 hours downtime per year)
- **Recovery Time Objective (RTO)**: < 4 hours
- **Recovery Point Objective (RPO)**: < 1 hour
- **Backup Frequency**: Every 6 hours

## Build and Deployment

### Build Process
```bash
# Frontend Build
npm run build:frontend
# Outputs to frontend/dist/

# Backend Build
npm run build:backend
# Outputs to backend/dist/

# Full Build
npm run build
```

### Docker Deployment
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Docker Registry**: Container image storage
- **Kubernetes**: Container orchestration (production)
- **Monitoring**: Prometheus, Grafana, ELK Stack

## Testing Approach

### Unit Testing
- **Backend**: Jest with supertest for API testing
- **Frontend**: Vitest with React Testing Library
- **Coverage**: Minimum 80% code coverage requirement

### Integration Testing
- **API Testing**: End-to-end API testing with supertest
- **Database Testing**: Integration tests with test database
- **External Services**: Mocked external service calls

### End-to-End Testing
- **Playwright**: Browser automation for E2E testing
- **Test Scenarios**: Complete user workflows
- **Cross-browser**: Chrome, Firefox, Safari testing

### Performance Testing
- **Load Testing**: Artillery or k6 for load testing
- **Stress Testing**: System behavior under extreme load
- **Monitoring**: Real-time performance metrics

## Environment Configuration

### Development Environment
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/xrpl_manager_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production
XRPL_PRIMARY_NODE=wss://s.altnet.rippletest.net:51233
XRPL_BACKUP_NODES=wss://testnet.xrpl-labs.com,wss://s.altnet.rippletest.net:51233
```

### Production Environment
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db:5432/xrpl_manager_prod
REDIS_URL=redis://redis:6379
JWT_SECRET=<secure-production-secret>
XRPL_PRIMARY_NODE=wss://xrplcluster.com
XRPL_BACKUP_NODES=wss://s1.ripple.com,wss://s2.ripple.com
```

---

*This document describes the technologies used in the project and how they're configured.* 