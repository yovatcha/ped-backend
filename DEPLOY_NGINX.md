# Deploy Nginx Configuration for dev1.superaffiliate.app

## Problem

The backend is running in Docker on the dev server (port 1337), but external users cannot access `dev1.superaffiliate.app` because there's no reverse proxy configured.

## Solution

Configure nginx on the dev server to proxy requests from `dev1.superaffiliate.app` to `localhost:1337`.

## Deployment Steps

### 1. SSH into Dev Server

```bash
ssh user@your-dev-server
```

### 2. Copy Nginx Configuration

Copy the `nginx-dev-server.conf` file to the dev server:

```bash
# On your local machine
scp nginx-dev-server.conf user@your-dev-server:/tmp/
```

### 3. Install Nginx Configuration

```bash
# On the dev server
sudo cp /tmp/nginx-dev-server.conf /etc/nginx/sites-available/dev1.superaffiliate.app
sudo ln -s /etc/nginx/sites-available/dev1.superaffiliate.app /etc/nginx/sites-enabled/
```

### 4. Set Up SSL Certificate (Using Let's Encrypt)

```bash
# Install certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d dev1.superaffiliate.app
```

Certbot will:

- Automatically obtain SSL certificate
- Update the nginx config with SSL certificate paths
- Set up auto-renewal

### 5. Test Nginx Configuration

```bash
sudo nginx -t
```

You should see:

```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 6. Reload Nginx

```bash
sudo systemctl reload nginx
```

### 7. Verify Backend is Running

```bash
# Check if Docker containers are running
docker ps | grep strapi

# Check if port 1337 is listening
sudo netstat -tlnp | grep 1337
```

### 8. Test Access

From your local machine or any external network:

```bash
curl -I https://dev1.superaffiliate.app/_health
```

You should get a `200 OK` response.

## Troubleshooting

### Issue: "Connection refused"

**Cause**: Docker container not running  
**Fix**:

```bash
cd /path/to/coupon-backend
docker-compose -f docker-compose.dev.yml up -d
```

### Issue: "502 Bad Gateway"

**Cause**: Nginx can't connect to localhost:1337  
**Fix**: Check if Strapi is running on port 1337

```bash
curl http://localhost:1337/_health
```

### Issue: "SSL certificate error"

**Cause**: SSL not configured  
**Fix**: Run certbot again

```bash
sudo certbot --nginx -d dev1.superaffiliate.app
```

### Issue: "404 Not Found" for uploads

**Cause**: CORS or file permissions  
**Fix**: Already fixed in our previous changes (CORS middleware)

## Firewall Configuration

If you still can't access from external networks, check firewall:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Or for firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Verify Everything Works

1. ✅ Access admin: `https://dev1.superaffiliate.app/admin`
2. ✅ Upload image in Media Library
3. ✅ Image URL is: `https://dev1.superaffiliate.app/uploads/...`
4. ✅ Image accessible from external network
5. ✅ Frontend at `https://dev2.superaffiliate.app` can access backend
6. ✅ n8n can fetch images (no CORS errors)
