# OAuth Authentication Setup Guide

This document provides detailed instructions for setting up OAuth authentication with Google and Apple for the XRPL Multi-Sign Manager.

## Overview

The application supports OAuth authentication with:
- **Google OAuth 2.0** - Using Google Sign-In
- **Apple Sign-In** - Using Apple's Sign in with Apple

## Features

- ✅ **Social Login** - Users can sign in with Google or Apple
- ✅ **Account Linking** - Link OAuth accounts to existing email/password accounts
- ✅ **Account Unlinking** - Unlink OAuth accounts (requires password set)
- ✅ **Automatic User Creation** - New users are created automatically
- ✅ **Secure Token Verification** - Proper token validation
- ✅ **Session Management** - JWT tokens with refresh functionality

## API Endpoints

### OAuth Authentication

#### Google OAuth
```http
POST /api/oauth/google
Content-Type: application/json

{
  "idToken": "google-id-token-from-client"
}
```

#### Apple OAuth
```http
POST /api/oauth/apple
Content-Type: application/json

{
  "idToken": "apple-id-token-from-client"
}
```

### Account Management

#### Link OAuth Account
```http
POST /api/oauth/link
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "provider": "google|apple",
  "idToken": "oauth-id-token"
}
```

#### Unlink OAuth Account
```http
POST /api/oauth/unlink
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "provider": "google|apple"
}
```

## Response Format

### Successful Authentication
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "mfaEnabled": false,
      "oauthProvider": "google"
    },
    "expiresIn": 900,
    "isNewUser": false
  }
}
```

## Setup Instructions

### 1. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API

#### Step 2: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required information:
   - App name: "XRPL Multi-Sign Manager"
   - User support email
   - Developer contact information
4. Add scopes:
   - `email`
   - `profile`
   - `openid`

#### Step 3: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3001/api/oauth/google/callback` (development)
   - `https://yourdomain.com/api/oauth/google/callback` (production)
5. Copy the Client ID and Client Secret

#### Step 4: Update Environment Variables
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/oauth/google/callback
```

### 2. Apple Sign-In Setup

#### Step 1: Create Apple Developer Account
1. Go to [Apple Developer](https://developer.apple.com/)
2. Sign in with your Apple ID
3. Enroll in the Apple Developer Program ($99/year)

#### Step 2: Create App ID
1. Go to "Certificates, Identifiers & Profiles"
2. Click "Identifiers" > "+"
3. Choose "App IDs" > "App"
4. Fill in required information:
   - Description: "XRPL Multi-Sign Manager"
   - Bundle ID: `com.yourcompany.xrpl-manager`
5. Enable "Sign In with Apple" capability
6. Save the App ID

#### Step 3: Create Service ID
1. Go to "Identifiers" > "+"
2. Choose "Services IDs" > "Services"
3. Fill in required information:
   - Description: "XRPL Multi-Sign Manager Web"
   - Identifier: `com.yourcompany.xrpl-manager.web`
4. Enable "Sign In with Apple" capability
5. Configure domains:
   - Primary App ID: Select your App ID
   - Domains and Subdomains: `yourdomain.com`
   - Return URLs: `https://yourdomain.com/api/oauth/apple/callback`

#### Step 4: Create Private Key
1. Go to "Keys" > "+"
2. Choose "Sign In with Apple"
3. Fill in required information:
   - Key Name: "XRPL Manager Sign In Key"
   - Key ID: Note this down
4. Download the private key file (.p8)
5. Note the Team ID from your account

#### Step 5: Update Environment Variables
```bash
APPLE_CLIENT_ID=com.yourcompany.xrpl-manager.web
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
APPLE_CALLBACK_URL=https://yourdomain.com/api/oauth/apple/callback
```

## Frontend Integration

### Google Sign-In

#### HTML
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

#### JavaScript
```javascript
// Initialize Google Sign-In
google.accounts.id.initialize({
  client_id: 'YOUR_GOOGLE_CLIENT_ID',
  callback: handleGoogleSignIn
});

// Handle Google Sign-In
async function handleGoogleSignIn(response) {
  try {
    const result = await fetch('/api/oauth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: response.credential
      })
    });

    const data = await result.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      // Redirect or update UI
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Google sign-in failed:', error);
  }
}

// Render Google Sign-In button
google.accounts.id.renderButton(
  document.getElementById('google-signin-button'),
  { theme: 'outline', size: 'large' }
);
```

### Apple Sign-In

#### HTML
```html
<script type="text/javascript" src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>
```

#### JavaScript
```javascript
// Initialize Apple Sign-In
AppleID.auth.init({
  clientId: 'com.yourcompany.xrpl-manager.web',
  scope: 'email name',
  redirectURI: 'https://yourdomain.com/api/oauth/apple/callback',
  state: 'origin:web'
});

// Handle Apple Sign-In
async function handleAppleSignIn() {
  try {
    const response = await AppleID.auth.signIn();
    
    const result = await fetch('/api/oauth/apple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: response.authorization.id_token
      })
    });

    const data = await result.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      // Redirect or update UI
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Apple sign-in failed:', error);
  }
}
```

## Security Considerations

### Token Verification
- **Google**: Verify ID tokens using Google's public keys
- **Apple**: Verify ID tokens using Apple's public keys
- **JWT**: Use strong secrets and proper expiration times

### Account Linking
- Users can link multiple OAuth providers to one account
- OAuth accounts can only be linked to one user
- Unlinking requires a password to be set

### Rate Limiting
- OAuth endpoints are rate-limited
- Failed attempts are logged and monitored

### Data Privacy
- Only necessary user data is stored
- OAuth tokens are not stored (only user info)
- Users can unlink OAuth accounts at any time

## Troubleshooting

### Common Issues

#### Google OAuth
- **Invalid redirect URI**: Ensure callback URL matches exactly
- **Missing scopes**: Add required scopes in OAuth consent screen
- **Client ID mismatch**: Verify client ID in frontend and backend

#### Apple Sign-In
- **Invalid client ID**: Ensure Service ID matches client ID
- **Domain verification**: Verify domain in Apple Developer Console
- **Private key format**: Ensure private key is properly formatted

#### General
- **CORS issues**: Configure CORS properly for your domain
- **Token expiration**: Implement proper token refresh logic
- **Database errors**: Ensure OAuth fields are added to users table

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=true
LOG_LEVEL=debug
```

## Production Deployment

### Environment Variables
Ensure all OAuth environment variables are set in production:
```bash
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/oauth/google/callback

APPLE_CLIENT_ID=com.yourcompany.xrpl-manager.web
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY=your-private-key
APPLE_CALLBACK_URL=https://yourdomain.com/api/oauth/apple/callback
```

### SSL/TLS
- Use HTTPS in production
- Configure proper SSL certificates
- Enable HSTS headers

### Monitoring
- Monitor OAuth authentication attempts
- Log failed authentication attempts
- Set up alerts for unusual activity

## Support

For issues with OAuth setup:
1. Check the application logs
2. Verify environment variables
3. Test with OAuth provider's test tools
4. Contact support with detailed error messages 