FROM nginx:alpine

# Install OpenSSL for certificate generation
RUN apk add --no-cache openssl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Create the script to generate self-signed certificates
RUN echo '#!/bin/sh' > /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '# Generate self-signed SSL certificate if it does not exist' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo 'if [ ! -f /etc/nginx/ssl/server.crt ]; then' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '    echo "Generating self-signed SSL certificate..."' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '        -keyout /etc/nginx/ssl/server.key \' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '        -out /etc/nginx/ssl/server.crt \' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '        -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=localhost"' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '    echo "SSL certificate generated successfully"' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo 'else' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo '    echo "SSL certificate already exists"' >> /docker-entrypoint.d/10-generate-ssl.sh && \
    echo 'fi' >> /docker-entrypoint.d/10-generate-ssl.sh

# Make the script executable
RUN chmod +x /docker-entrypoint.d/10-generate-ssl.sh

# Create non-root user for security
RUN getent group nginx || addgroup -g 1001 -S nginx && \
    getent passwd nginx || adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1
