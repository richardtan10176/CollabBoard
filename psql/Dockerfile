FROM postgres:16-alpine

# Set environment variables
ENV POSTGRES_DB=collabboard
ENV POSTGRES_USER=collabboard
ENV POSTGRES_PASSWORD=collabboard_dev_password

# Copy initialization scripts
COPY init.sql /docker-entrypoint-initdb.d/

# Expose the PostgreSQL port
EXPOSE 5432

# The postgres image automatically runs any .sql files in docker-entrypoint-initdb.d/
# on database initialization
