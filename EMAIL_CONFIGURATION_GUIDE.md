# Email Configuration Guide for NewsGlide

This guide explains how to configure custom email settings and branding for NewsGlide's password reset emails.

## Issue Summary

1. **Redirect URL Issue**: Password reset links redirect to `localhost:3000` which doesn't work in production
2. **Email Branding**: Emails are sent from "Supabase Auth" instead of "NewsGlide"

## Solution Overview

### 1. Password Reset Page (✅ Completed)
- Created `/src/pages/ResetPassword.tsx` component
- Added route `/reset-password` in App.tsx
- Handles password update when users click the reset link

### 2. Configure Production URL

#### In Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Update the following:
   - **Site URL**: Set to your production URL (e.g., `https://newsglide.com`)
   - **Redirect URLs**: Add your production URL patterns:
     - `https://newsglide.com`
     - `https://newsglide.com/reset-password`
     - `https://www.newsglide.com` (if using www)
     - `https://www.newsglide.com/reset-password`

### 3. Configure Custom Email Settings

#### Option A: Use Custom SMTP (Recommended for branding)

1. **In Supabase Dashboard**:
   - Go to **Authentication** → **Email** → **SMTP Settings**
   - Enable "Custom SMTP"
   - Configure with your email provider:

   ```
   Host: smtp.gmail.com (for Gmail)
   Port: 587
   Username: glidethenews@gmail.com
   Password: [App-specific password]
   Sender email: glidethenews@gmail.com
   Sender name: NewsGlide
   ```

2. **For Gmail**:
   - Enable 2-factor authentication on the Gmail account
   - Generate an app-specific password:
     - Go to Google Account settings
     - Security → 2-Step Verification → App passwords
     - Generate a password for "Mail"
   - Use this app password in the SMTP settings

#### Option B: Use Resend, SendGrid, or other email services

1. Sign up for an email service (Resend, SendGrid, Mailgun, etc.)
2. Get SMTP credentials
3. Configure in Supabase Dashboard with the provided settings

### 4. Customize Email Templates

In Supabase Dashboard:

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password** template
3. Customize the template:

```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>You requested to reset your password for your NewsGlide account.</p>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, please ignore this email.</p>
<p>Thanks,<br>The NewsGlide Team</p>
```

4. Update subject line to: "Reset your NewsGlide password"

### 5. Environment-Specific Configuration

For the local `supabase/config.toml`:
- Keep `site_url = "http://localhost:3000"` for local development
- Production URLs are configured in the Supabase Dashboard

### 6. Testing

1. **Local Testing**:
   - Emails go to Inbucket at http://localhost:54325
   - Test the full flow locally

2. **Production Testing**:
   - Create a test account
   - Request password reset
   - Verify email arrives from NewsGlide
   - Verify reset link goes to production URL
   - Complete password reset

## Important Notes

- SMTP credentials should NEVER be committed to the repository
- Always use app-specific passwords, not your main email password
- Test thoroughly in a staging environment before production
- Monitor email delivery rates and spam scores

## Troubleshooting

### Common Issues:

1. **Emails going to spam**:
   - Set up SPF, DKIM, and DMARC records for your domain
   - Use a reputable email service
   - Avoid spam trigger words in templates

2. **SMTP connection errors**:
   - Verify credentials are correct
   - Check if your email provider requires app-specific passwords
   - Ensure the correct port and encryption method

3. **Reset links still going to localhost**:
   - Clear Supabase cache
   - Verify Site URL is saved in dashboard
   - Check if there are any hardcoded URLs in the code

## Next Steps

1. Configure SMTP in Supabase Dashboard
2. Update email templates
3. Test the complete flow
4. Set up email domain authentication (SPF, DKIM, DMARC)