# OADRO Radio Voting System Design

## Overview
Comprehensive like/dislike voting system with Discord authentication, real-time updates, and admin feedback collection.

## System Architecture

### Core Components
1. **Database Layer**: PostgreSQL with optimized schemas
2. **Authentication**: Discord OAuth integration
3. **API Layer**: REST endpoints with rate limiting
4. **Real-time**: WebSocket connections for live updates
5. **Caching**: Redis for vote count optimization
6. **Frontend**: React components with accessibility
7. **Admin Panel**: Dislike feedback management

## Database Schema

### Songs Table
```sql
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    song_id VARCHAR(255) UNIQUE NOT NULL, -- AzuraCast song ID
    title VARCHAR(500) NOT NULL,
    artist VARCHAR(500) NOT NULL,
    album_art TEXT,
    genre VARCHAR(100),
    duration INTEGER,
    like_count INTEGER DEFAULT 0,
    dislike_count INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_songs_song_id ON songs(song_id);
CREATE INDEX idx_songs_votes ON songs(like_count, dislike_count);
```

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    discriminator VARCHAR(10),
    avatar VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_discord_id ON users(discord_id);
```

### Votes Table
```sql
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) CHECK (vote_type IN ('like', 'dislike')) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_id)
);

CREATE INDEX idx_votes_user_song ON votes(user_id, song_id);
CREATE INDEX idx_votes_song_type ON votes(song_id, vote_type);
CREATE INDEX idx_votes_timestamp ON votes(timestamp);
```

### Dislike Feedback Table
```sql
CREATE TABLE dislike_feedback (
    id SERIAL PRIMARY KEY,
    vote_id INTEGER REFERENCES votes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    category VARCHAR(50), -- 'quality', 'content', 'technical', 'other'
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dislike_feedback_reviewed ON dislike_feedback(is_reviewed);
CREATE INDEX idx_dislike_feedback_song ON dislike_feedback(song_id);
```

## API Endpoints

### Authentication
- `POST /api/auth/discord` - Discord OAuth callback
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

### Voting
- `POST /api/songs/{songId}/vote` - Submit/update vote
- `GET /api/songs/{songId}/votes` - Get vote counts
- `DELETE /api/songs/{songId}/vote` - Remove vote
- `GET /api/songs/{songId}/user-vote` - Get user's current vote

### Feedback
- `POST /api/votes/{voteId}/feedback` - Submit dislike feedback
- `GET /api/admin/feedback` - Get all feedback (admin only)
- `PUT /api/admin/feedback/{id}/review` - Mark feedback as reviewed

### Analytics
- `GET /api/admin/analytics/votes` - Voting statistics
- `GET /api/songs/trending` - Most liked/disliked songs

## Security Measures

### Rate Limiting
- Voting: 10 votes per minute per user
- Feedback: 5 submissions per hour per user
- API calls: 100 requests per minute per IP

### Authentication
- Discord OAuth with secure token storage
- JWT tokens with expiration
- CSRF protection

### Vote Validation
- Prevent duplicate votes (database constraint)
- Vote switching allowed (update existing vote)
- Spam detection and prevention

## Real-time Features

### WebSocket Events
- `vote_updated` - Vote count changes
- `new_feedback` - New dislike feedback (admin only)
- `song_trending` - Trending song updates

## Caching Strategy

### Redis Cache
- Vote counts: `song:{songId}:votes` (TTL: 5 minutes)
- User votes: `user:{userId}:votes` (TTL: 1 hour)
- Trending songs: `trending:songs` (TTL: 15 minutes)

## Frontend Components

### VotingButtons Component
- Like/dislike buttons with visual feedback
- Real-time vote count updates
- Loading states and error handling
- Accessibility compliance

### DislikeFeedbackModal Component
- Form for dislike reasoning
- Category selection
- Character limit validation
- Mobile-responsive design

### AdminFeedbackPanel Component
- Feedback list with filtering
- Review status management
- Song information display
- Bulk actions

## Performance Optimizations

### Database
- Proper indexing on frequently queried columns
- Connection pooling
- Query optimization
- Batch operations for bulk updates

### Caching
- Redis for frequently accessed data
- CDN for static assets
- Browser caching headers

### Load Balancing
- Horizontal scaling support
- Database read replicas
- WebSocket connection distribution

## Admin Features

### Feedback Management
- View all dislike feedback
- Filter by category, date, song
- Mark as reviewed
- Export functionality

### Analytics Dashboard
- Vote statistics
- User engagement metrics
- Trending analysis
- Abuse detection

## Mobile & Accessibility

### Mobile Optimization
- Touch-friendly buttons
- Responsive design
- Offline vote queuing
- Progressive enhancement

### Accessibility
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- High contrast mode

## Implementation Phases

### Phase 1: Core Infrastructure
1. Database setup and migrations
2. Discord authentication
3. Basic voting API
4. Simple frontend components

### Phase 2: Enhanced Features
1. Real-time updates
2. Dislike feedback system
3. Admin panel
4. Caching implementation

### Phase 3: Optimization & Analytics
1. Performance optimizations
2. Analytics dashboard
3. Advanced security measures
4. Load testing and scaling

## Security Considerations

### Data Protection
- User data encryption
- Secure token storage
- GDPR compliance
- Data retention policies

### Abuse Prevention
- Rate limiting
- Vote manipulation detection
- IP-based restrictions
- Automated moderation

## Monitoring & Logging

### Metrics
- Vote submission rates
- Error rates
- Response times
- User engagement

### Logging
- Vote activities
- Authentication events
- Error tracking
- Performance metrics