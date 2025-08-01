# System Patterns: XRPL Multi-Sign Manager
*Version: 1.0*
*Created: 2025-01-27*
*Last Updated: 2025-01-27*

## Architecture Overview

The XRPL Multi-Sign Manager follows a **layered microservices architecture** with a clear separation of concerns. The system is designed around the principle of **non-custodial security**, where the application coordinates multi-signature workflows without storing private keys. The architecture emphasizes **real-time coordination**, **external wallet integration**, and **enterprise-grade security**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App  │  API Clients  │  Admin UI   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Load Balancer  │  Rate Limiting  │  Authentication  │  CORS    │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Wallet Service  │  Auth Service  │  Notification  │  Analytics │
│  Transaction     │  User Mgmt     │  Service       │  Service   │
│  Service         │  Service       │                │            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Redis Cache  │  File Storage  │  Audit Logs   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  External Integration Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  XRPL Nodes  │  KYC/AML      │  HSM          │  Notification  │
│              │  Providers    │  Services     │  Providers     │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### Frontend Application (React/TypeScript)
- **Purpose**: User interface for wallet management and transaction coordination
- **Responsibilities**: 
  - User authentication and session management
  - Wallet import and configuration
  - Transaction proposal creation and tracking
  - Real-time signature progress monitoring
  - Mobile-responsive design

### Backend API (Node.js/Express)
- **Purpose**: Core business logic and API endpoints
- **Responsibilities**:
  - RESTful API for all operations
  - Authentication and authorization
  - XRPL transaction handling
  - Real-time WebSocket communication
  - Audit logging and compliance

### Database Layer (PostgreSQL)
- **Purpose**: Persistent data storage and transaction management
- **Responsibilities**:
  - User account management
  - Wallet and signer data
  - Transaction history and audit logs
  - Configuration and settings

### Cache Layer (Redis)
- **Purpose**: Session management and performance optimization
- **Responsibilities**:
  - User session storage
  - API response caching
  - Real-time data synchronization
  - Rate limiting and security

### XRPL Integration Service
- **Purpose**: Direct interaction with XRP Ledger
- **Responsibilities**:
  - Multi-signature wallet operations
  - Transaction building and submission
  - Account information retrieval
  - Network monitoring and health checks

## Design Patterns in Use

### Repository Pattern
- **Usage Context**: Data access layer abstraction
- **Implementation**: Sequelize ORM with repository interfaces
- **Benefits**: Decoupled data access, testable business logic

```typescript
interface WalletRepository {
  findById(id: string): Promise<Wallet | null>;
  create(wallet: CreateWalletDto): Promise<Wallet>;
  update(id: string, updates: Partial<Wallet>): Promise<Wallet>;
  delete(id: string): Promise<void>;
}
```

### Service Layer Pattern
- **Usage Context**: Business logic encapsulation
- **Implementation**: Service classes for each domain
- **Benefits**: Reusable business logic, clear separation of concerns

```typescript
class WalletService {
  async createWallet(data: CreateWalletDto): Promise<Wallet> {
    // Business logic for wallet creation
  }
  
  async importWallet(address: string): Promise<Wallet> {
    // Business logic for wallet import
  }
}
```

### Observer Pattern
- **Usage Context**: Real-time updates and notifications
- **Implementation**: Socket.io for WebSocket communication
- **Benefits**: Decoupled real-time updates, scalable event handling

```typescript
// Event emission
socket.emit('transaction:updated', { transactionId, status });

// Event listening
socket.on('transaction:updated', (data) => {
  // Handle transaction update
});
```

### Factory Pattern
- **Usage Context**: XRPL transaction creation
- **Implementation**: Transaction builder factories
- **Benefits**: Flexible transaction creation, type safety

```typescript
class TransactionFactory {
  static createPaymentTransaction(params: PaymentParams): Transaction {
    // Create payment transaction
  }
  
  static createTrustSetTransaction(params: TrustSetParams): Transaction {
    // Create trust set transaction
  }
}
```

### Strategy Pattern
- **Usage Context**: Authentication methods and wallet integrations
- **Implementation**: Passport.js strategies and wallet adapters
- **Benefits**: Pluggable authentication, extensible wallet support

```typescript
interface WalletIntegrationStrategy {
  connect(address: string): Promise<ConnectionResult>;
  sign(transaction: Transaction): Promise<SignatureResult>;
  verify(signature: string): Promise<boolean>;
}
```

### Command Pattern
- **Usage Context**: Transaction operations and audit logging
- **Implementation**: Command objects for complex operations
- **Benefits**: Undo/redo capability, audit trail, transaction safety

```typescript
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  log(): AuditLogEntry;
}
```

## Data Flow

### Wallet Import Flow
```
1. User enters wallet address
2. Frontend validates address format
3. Backend queries XRPL for wallet info
4. System verifies multi-signature configuration
5. Wallet data is stored in database
6. Real-time notification sent to all signers
7. Frontend displays wallet dashboard
```

### Transaction Coordination Flow
```
1. User creates transaction proposal
2. Backend builds unsigned XRPL transaction
3. System notifies all required signers
4. Signers review and sign with external wallets
5. Signatures are collected and validated
6. When quorum is met, transaction is submitted
7. Real-time updates sent to all participants
8. Transaction status tracked and logged
```

### Authentication Flow
```
1. User provides credentials
2. System validates credentials
3. MFA challenge if enabled
4. JWT token generated
5. Session stored in Redis
6. User redirected to dashboard
7. Real-time session monitoring
```

## Key Technical Decisions

### Non-Custodial Architecture
- **Decision**: Application never stores private keys
- **Rationale**: Enhanced security, reduced compliance burden, user trust
- **Implementation**: External wallet integration, signature collection

### Real-Time Communication
- **Decision**: WebSocket-based real-time updates
- **Rationale**: Immediate feedback, collaborative workflow, user experience
- **Implementation**: Socket.io for bidirectional communication

### Multi-Network Support
- **Decision**: Support for testnet, mainnet, and devnet
- **Rationale**: Development flexibility, testing capabilities, production readiness
- **Implementation**: Environment-based XRPL node configuration

### Role-Based Access Control
- **Decision**: Granular permission system
- **Rationale**: Enterprise security, compliance requirements, flexible access
- **Implementation**: JWT-based authorization with role claims

### Audit Trail
- **Decision**: Comprehensive logging of all operations
- **Rationale**: Compliance requirements, security monitoring, debugging
- **Implementation**: Structured logging with Winston, audit log table

## Component Relationships

### Service Dependencies
```
WalletService
├── XRPLService (XRPL operations)
├── NotificationService (user notifications)
├── AuditService (logging)
└── UserService (user management)

TransactionService
├── WalletService (wallet validation)
├── XRPLService (transaction submission)
├── NotificationService (signer notifications)
└── AuditService (transaction logging)

AuthService
├── UserService (user validation)
├── NotificationService (MFA notifications)
└── AuditService (login logging)
```

### Data Relationships
```
User (1) ── (N) UserWalletConnection
User (1) ── (N) WalletSigner
Wallet (1) ── (N) WalletSigner
Wallet (1) ── (N) Transaction
Transaction (1) ── (N) TransactionSignature
User (1) ── (N) AuditLog
```

### External Integrations
```
XRPLService
├── Primary XRPL Node (wss://xrplcluster.com)
├── Backup XRPL Nodes (wss://s1.ripple.com, wss://s2.ripple.com)
└── Health monitoring and failover

NotificationService
├── Email (Nodemailer)
├── SMS (Twilio)
├── Push Notifications (Firebase)
└── WebSocket (Socket.io)

KYCService
├── Identity verification providers
├── Risk assessment engines
└── Compliance reporting systems
```

## Security Architecture

### Authentication Layers
```
1. Username/Password Authentication
2. Multi-Factor Authentication (TOTP, SMS, Hardware Keys)
3. Session Management (Redis-based)
4. JWT Token Validation
5. Rate Limiting and Brute Force Protection
```

### Authorization Model
```
Super Admin: Full system access
Admin: User and wallet management
Wallet Owner: Full wallet control
Signer: Transaction signing permissions
Viewer: Read-only access
```

### Data Protection
```
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Secure session handling
- Audit logging
- Data retention policies
```

## Scalability Considerations

### Horizontal Scaling
- **Load Balancing**: Multiple backend instances
- **Database Sharding**: User-based sharding strategy
- **Cache Distribution**: Redis cluster for high availability
- **CDN**: Static asset delivery optimization

### Performance Optimization
- **Database Indexing**: Optimized queries and indexes
- **Caching Strategy**: Multi-layer caching (Redis, CDN)
- **Connection Pooling**: Database and XRPL connection management
- **Async Processing**: Background job processing

### Monitoring and Observability
- **Application Metrics**: Request rate, response time, error rate
- **Business Metrics**: Wallets created, transactions processed
- **Infrastructure Metrics**: CPU, memory, disk, network
- **Security Metrics**: Failed logins, suspicious activities

---

*This document captures the system architecture and design patterns used in the project.* 