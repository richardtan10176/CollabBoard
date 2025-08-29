-- CollabBoard Database Initialization
-- This script sets up the initial database schema for the collaborative markdown editor

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Documents table for markdown files metadata
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    current_content TEXT DEFAULT ''
);

-- Document versions for version history
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_description TEXT
);

-- Active sessions for tracking who's currently editing
CREATE TABLE active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    socket_id VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cursor_position INTEGER DEFAULT 0,
    UNIQUE(document_id, user_id)
);

-- Indexes for better performance
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX idx_document_versions_document ON document_versions(document_id, version_number DESC);
CREATE INDEX idx_active_sessions_document ON active_sessions(document_id);
CREATE INDEX idx_active_sessions_user ON active_sessions(user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on documents
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user for testing (password: 'admin123')
-- Password hash generated using bcrypt with salt rounds = 10
INSERT INTO users (username, email, password_hash) VALUES 
('admin', 'admin@collabboard.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Insert a sample document
INSERT INTO documents (title, owner_id, current_content) VALUES 
('Welcome to CollabBoard', 
 (SELECT id FROM users WHERE username = 'admin'), 
 '# Welcome to CollabBoard

This is your first collaborative markdown document!

## Features
- Real-time collaboration
- Version history
- User authentication

Start editing to see the magic happen!');

-- Insert initial version for the sample document
INSERT INTO document_versions (document_id, content, version_number, created_by, change_description) VALUES 
((SELECT id FROM documents WHERE title = 'Welcome to CollabBoard'),
 '# Welcome to CollabBoard

This is your first collaborative markdown document!

## Features
- Real-time collaboration
- Version history
- User authentication

Start editing to see the magic happen!',
 1,
 (SELECT id FROM users WHERE username = 'admin'),
 'Initial document creation');
