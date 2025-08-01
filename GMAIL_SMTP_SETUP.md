# Gmail SMTP Setup Guide for Email Verification

## Prerequisites
- Gmail account
- 2-Factor Authentication enabled on your Gmail account

## Step-by-Step Setup

### 1. Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click "Security" in the left sidebar
3. Click "2-Step Verification"
4. Follow the prompts to enable 2FA

### 2. Generate App Password
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click "Security" → "App passwords"
3. Select "Mail" for the app
4. Select "Other (Custom name)" for device
5. Enter "XRPL Multi-Sign Manager" as the name
6. Click "Generate"
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory with the following email configuration:

```bash
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM=noreply@xrpl-manager.com
FRONTEND_URL=http://localhost:3000
```

**Replace the following:**
- `your-gmail@gmail.com` with your actual Gmail address
- `your-16-character-app-password` with the app password you generated

### 4. Test Email Configuration

Run the backend and test the email service:

```bash
cd backend
npm run dev
```

Then test registration:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 5. Check Email Delivery

1. Check your Gmail inbox for the verification email
2. Check Gmail's "Sent" folder to confirm emails are being sent
3. Check Gmail's "Spam" folder if you don't see the email

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error**
   - Make sure you're using the app password, not your regular Gmail password
   - Ensure 2FA is enabled on your Gmail account

2. **"Authentication failed" error**
   - Double-check the SMTP settings
   - Verify the app password is correct
   - Make sure there are no extra spaces in the password

3. **Emails not being sent**
   - Check the backend logs for SMTP errors
   - Verify your Gmail account isn't blocked
   - Check if you've reached Gmail's sending limits

### Gmail Sending Limits
- **Free Gmail**: 500 emails per day
- **Google Workspace**: 2000 emails per day
- **Rate limit**: 100 emails per hour

### Security Best Practices
1. Never commit your `.env` file to version control
2. Use different app passwords for different environments
3. Regularly rotate your app passwords
4. Monitor your Gmail account for suspicious activity

## Production Considerations

For production deployment:

1. **Use a dedicated email service** like SendGrid or Mailgun
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor email deliverability**
4. **Implement email templates** with your branding
5. **Set up email analytics** to track open rates

## Alternative Email Providers

If Gmail doesn't work for you, consider:

- **SendGrid**: 100 emails/day free
- **Mailgun**: 5,000 emails/month free
- **AWS SES**: $0.10 per 1,000 emails
- **Resend**: 3,000 emails/month free

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify your Gmail account settings
3. Test with a different email provider
4. Contact support with specific error messages 