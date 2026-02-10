# Strapi Backend - Deployment Guide

## Quick Start with Docker Compose

### Starting the Application

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f strapi
```

### Stopping the Application

```bash
# Stop the container
docker-compose down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

## Image Persistence Solution

This project uses Docker volumes to persist uploaded images and database data:

- **`./public/uploads`** - Stores all uploaded media files
- **`./.tmp`** - Stores the SQLite database

### What This Means

✅ **Images persist** after container restarts  
✅ **Database persists** after container restarts  
✅ **No data loss** when rebuilding the container

### Important Notes

1. **Backup**: The `public/uploads` and `.tmp` directories on your host machine contain all your data. Back them up regularly.

2. **Rebuilding**: When you make code changes:

   ```bash
   # Rebuild and restart (data is preserved)
   docker-compose up -d --build
   ```

3. **Fresh Start**: To start completely fresh:

   ```bash
   # Stop and remove containers
   docker-compose down

   # Remove persisted data
   rm -rf public/uploads/*
   rm -rf .tmp/*

   # Start fresh
   docker-compose up -d
   ```

## Alternative: Cloud Storage (Production)

For production environments, consider using cloud storage instead of local volumes:

- **AWS S3** - Install `@strapi/provider-upload-aws-s3`
- **Cloudinary** - Install `@strapi/provider-upload-cloudinary`
- **Google Cloud Storage** - Install `@strapi/provider-upload-google-cloud-storage`

See `implementation_plan.md` for detailed cloud storage setup instructions.

## Troubleshooting

### Images still not showing after restart?

1. Check if volumes are mounted:

   ```bash
   docker-compose ps
   docker inspect <container_id> | grep Mounts -A 20
   ```

2. Verify files exist on host:

   ```bash
   ls -la public/uploads/
   ```

3. Check container logs:
   ```bash
   docker-compose logs strapi
   ```

### Permission issues?

If you encounter permission errors:

```bash
# Fix permissions on host
chmod -R 755 public/uploads
chmod -R 755 .tmp
```
