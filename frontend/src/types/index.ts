// User types
export interface User {
  id: string;
  username: string;
  email: string;
  documentCount?: number;
}

// Authentication types
export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Document types
export interface Document {
  id: string;
  title: string;
  content?: string;
  current_content?: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  owner_id?: string;
  owner_username: string;
  version_count?: number;
  isOwner?: boolean;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  created_at: string;
  change_description: string;
  created_by_username: string;
}

// Socket types
export interface ActiveUser {
  id: string;
  username: string;
  cursor_position?: number;
  joined_at: string;
}

export interface SocketUser {
  id: string;
  username: string;
}

export interface TextChangeEvent {
  content: string;
  operation?: any;
  user: SocketUser;
  timestamp: string;
}

export interface CursorMoveEvent {
  user: SocketUser;
  position: number;
  timestamp: string;
}

export interface UserJoinedEvent {
  user: SocketUser;
  joinedAt: string;
}

export interface UserLeftEvent {
  user: SocketUser;
  leftAt: string;
}

export interface SaveCompleteEvent {
  version: number;
  savedBy: SocketUser;
  timestamp: string;
}

export interface DocumentJoinedEvent {
  document: Document & {
    content: string;
    owner: {
      id: string;
      username: string;
    };
  };
  activeUsers: ActiveUser[];
}

// API Response types
export interface ApiResponse<T = any> {
  message?: string;
  error?: string;
  data?: T;
}

export interface DocumentsResponse {
  documents: Document[];
}

export interface DocumentResponse {
  document: Document;
}

export interface VersionsResponse {
  versions: DocumentVersion[];
}
