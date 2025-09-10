# Environment Configuration Guide

This guide walks you through setting up your production environment variables step by step.

## Step 1: Copy the Environment Template

After running the deployment script, you'll have a `.env` file. If you need to create it manually:

```bash
cp env.production .env
```

## Step 2: Edit the .env File

Open the `.env` file in a text editor:

```bash
nano .env
# or
vim .env
```

## Step 3: Update Each Configuration

### Database Password
**Find this line:**
```bash
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
```

**Replace with a secure password:**
```bash
DB_PASSWORD=MySecureDBPassword2024!
```

**Tips for a good password:**
- At least 12 characters long
- Mix of uppercase, lowercase, numbers, and symbols
- Don't use common words or patterns

### JWT Secret
**Find this line:**
```bash
JWT_SECRET=CHANGE_THIS_TO_A_VERY_SECURE_RANDOM_STRING_AT_LEAST_32_CHARACTERS
```

**Generate a secure random string:**
```bash
# On your local machine or EC2 instance, run:
openssl rand -base64 32
```

**Replace with the generated string:**
```bash
JWT_SECRET=a8f5f167f44f4964e6c998dee827110c
```

### Domain Configuration
**Find these lines:**
```bash
FRONTEND_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com
NEXT_PUBLIC_WS_URL=https://your-domain.com
```

**Replace "your-domain.com" with your actual domain:**
```bash
# If your domain is "mycollabboard.com":
FRONTEND_URL=https://mycollabboard.com
NEXT_PUBLIC_API_URL=https://mycollabboard.com
NEXT_PUBLIC_WS_URL=https://mycollabboard.com
```

## Step 4: Complete Example

Here's what a complete `.env` file might look like for domain "mycollabboard.com":

```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=collabboard
DB_USER=collabboard
DB_PASSWORD=MySecureDBPassword2024!

# JWT Configuration
JWT_SECRET=a8f5f167f44f4964e6c998dee827110c
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://mycollabboard.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Next.js Public Environment Variables
NEXT_PUBLIC_API_URL=https://mycollabboard.com
NEXT_PUBLIC_WS_URL=https://mycollabboard.com
```

## Step 5: Save and Verify

1. **Save the file** (Ctrl+X, then Y, then Enter in nano)
2. **Verify your changes:**
   ```bash
   cat .env
   ```
3. **Make sure there are no spaces around the equals signs:**
   ```bash
   # Correct:
   DB_PASSWORD=MyPassword123
   
   # Incorrect:
   DB_PASSWORD = MyPassword123
   ```

## Common Mistakes to Avoid

1. **Don't use spaces around equals signs**
2. **Don't put quotes around values** (unless the value itself contains spaces)
3. **Make sure your domain URLs use https://** (not http://)
4. **Don't commit the .env file to git** (it should be in .gitignore)

## Testing Your Configuration

After setting up your environment:

1. **Start the application:**
   ```bash
   sudo docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Check if services are running:**
   ```bash
   sudo docker-compose -f docker-compose.prod.yml ps
   ```

3. **View logs to check for errors:**
   ```bash
   sudo docker-compose -f docker-compose.prod.yml logs
   ```

## Troubleshooting

### "Database connection failed"
- Check your `DB_PASSWORD` is correct
- Make sure there are no extra spaces or characters

### "JWT secret is too short"
- Your `JWT_SECRET` must be at least 32 characters
- Generate a new one with: `openssl rand -base64 32`

### "CORS error" or "API not accessible"
- Check your domain URLs are correct
- Make sure you're using `https://` not `http://`
- Verify your domain is pointing to your EC2 instance

### "SSL certificate error"
- Make sure your domain DNS is properly configured
- Wait for DNS propagation (can take up to 48 hours)
- Check that your domain is pointing to your EC2 public IP
