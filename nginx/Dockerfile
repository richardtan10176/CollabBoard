FROM nginx:alpine

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create the script to generate self-signed certificates
RUN cat > /docker-entrypoint.d/10-generate-ssl.sh << 'EOF'
#!/bin/sh

# Generate self-signed SSL certificate if it doesn't exist
if [ ! -f /etc/nginx/ssl/server.crt ]; then
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/server.key \
        -out /etc/nginx/ssl/server.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"
    echo "SSL certificate generated successfully"
else
    echo "SSL certificate already exists"
fi
EOF

# Make the script executable
RUN chmod +x /docker-entrypoint.d/10-generate-ssl.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1
