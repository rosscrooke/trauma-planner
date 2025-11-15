# User Authentication Setup

## Current Demo User
- **Email**: lynn.hutchings@gmail.com
- **Password**: MK
- **Role**: Admin

## Adding New Users Securely

### Option 1: Netlify Identity (Recommended for Production)
1. In Netlify Dashboard, go to your site
2. Navigate to "Identity" tab
3. Click "Enable Identity"
4. Under "Registration", set to "Invite only"
5. Click "Invite users" and add email addresses
6. Users will receive invite emails to set their own passwords

### Option 2: Update Authentication Function
To add more hardcoded users (for development only):

1. Edit `netlify/functions/auth-validate.js`
2. Generate password hash using Node.js:
   ```javascript
   const crypto = require('crypto');
   const hash = crypto.createHash('sha256').update('PASSWORD_HERE').digest('hex');
   console.log(hash);
   ```
3. Add user to DEMO_USERS object:
   ```javascript
   'email@example.com': {
     passwordHash: 'generated_hash_here',
     name: 'User Name',
     role: 'admin' // or 'user'
   }
   ```

### Option 3: Environment Variables (Better Security)
1. Store user credentials in Netlify environment variables
2. Go to Site Settings > Environment Variables
3. Add variables like:
   - `USER_1_EMAIL`
   - `USER_1_PASSWORD_HASH`
   - `USER_1_NAME`
   - `USER_1_ROLE`

## Security Notes
- Never store plain text passwords
- Use HTTPS in production
- Consider implementing proper JWT tokens
- Add rate limiting to prevent brute force attacks
- Use Netlify Identity for production deployments

## Testing Locally
The app currently uses localStorage for session management.
Login credentials work both locally and when deployed.