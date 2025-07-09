# Clerk + Supabase JWT Configuration Guide

This guide walks you through setting up JWT authentication between Clerk and Supabase for secure Row Level Security (RLS).

## Step 1: Configure Clerk JWT Template

### 1.1 Access Clerk Dashboard
1. Log in to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **JWT Templates** under the **Authentication** section

### 1.2 Create Supabase JWT Template
1. Click **+ Create template**
2. Set the template name to: `supabase`
3. Configure the JWT claims with the following JSON:

```json
{
  "sub": "{{user.id}}",
  "role": "{{user.public_metadata.role}}",
  "email": "{{user.primary_email_address}}"
}
```

### 1.3 Save and Get Signing Secret
1. Click **Create** to save the template
2. Copy the **Signing Secret** (it starts with `sk_`)
3. Keep this secret secure - you'll need it for Supabase configuration

## Step 2: Configure Supabase JWT Secret

### 2.1 Access Supabase Dashboard
1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Project Settings** (gear icon in sidebar)
4. Go to **API** tab

### 2.2 Update JWT Secret
1. Find the **JWT Secret** field
2. Paste the Clerk signing secret you copied earlier
3. Click **Save** to update the configuration

## Step 3: Set User Roles in Clerk

### 3.1 Add Role to User Metadata
For each user that should have admin or business access:

1. Go to **Users** in Clerk Dashboard
2. Select a user
3. Click **Edit** on the user profile
4. In the **Public metadata** section, add:

```json
{
  "role": "admin"
}
```

or for business users:

```json
{
  "role": "business"
}
```

### 3.2 Programmatically Set Roles
You can also set roles programmatically when users sign up:

```javascript
// In your sign-up flow
await user.update({
  publicMetadata: {
    role: 'business'
  }
});
```

## Step 4: Test the Integration

### 4.1 Verify JWT Token
1. Sign in to your application
2. Open browser developer tools
3. Check the console for JWT-related logs
4. You should see: `✅ Got Clerk session token, setting in Supabase client`

### 4.2 Test Database Access
1. Try accessing admin features in your application
2. Check that RLS policies are working correctly
3. Verify users can only access their own data

## Step 5: Troubleshooting

### Common Issues:

#### "JWT template not found" Error
- Ensure the template name is exactly `supabase`
- Check that the template is saved and published

#### "Invalid JWT" Error
- Verify the JWT secret is correctly copied from Clerk to Supabase
- Make sure there are no extra spaces or characters

#### RLS Policies Not Working
- Confirm users have the correct role in their public metadata
- Check that the JWT claims include the `role` field
- Verify the user is properly authenticated

#### Database Connection Issues
- Ensure your Supabase URL and anon key are correct
- Check that the JWT secret matches between Clerk and Supabase

### Testing JWT Claims
You can test your JWT configuration by running this in your Supabase SQL Editor:

```sql
-- Check current user info
SELECT 
  auth.uid() as user_id,
  auth.role() as user_role,
  auth.email() as user_email;

-- Test helper functions
SELECT 
  is_admin() as is_admin,
  is_business_user() as is_business_user,
  get_user_role() as role;
```

## Step 6: Environment Variables

Make sure your application has these environment variables set:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Security Best Practices

1. **Never expose the JWT signing secret** - Only use it in Supabase configuration
2. **Use environment variables** for all sensitive configuration
3. **Test RLS policies thoroughly** before going to production
4. **Monitor JWT token expiration** and handle refresh appropriately
5. **Validate user roles** on both client and server side

## Next Steps

Once JWT integration is working:
1. Test all admin and business user features
2. Verify RLS policies are enforcing proper access control
3. Monitor authentication logs for any issues
4. Consider implementing role-based UI components

For additional support, refer to:
- [Clerk Documentation](https://clerk.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)