# OADRO Radio Voting System

A comprehensive like/dislike voting system with Discord authentication, real-time updates, admin feedback management, and analytics dashboard.

## Features

### Core Voting System
- ✅ Like/Dislike voting for songs
- ✅ Discord OAuth authentication
- ✅ Vote validation (one vote per user per song)
- ✅ Vote switching capability (like ↔ dislike)
- ✅ Real-time vote count updates via WebSocket
- ✅ Rate limiting and spam protection

### Admin Features
- ✅ Dislike feedback collection with categorization
- ✅ Admin panel for reviewing feedback (Discord ID: 416034191369830402)
- ✅ Feedback status management (pending/reviewed/resolved)
- ✅ Real-time admin notifications
- ✅ Analytics dashboard with trending songs
- ✅ CSV export functionality

### Performance & Security
- ✅ Redis caching for vote counts
- ✅ Database query optimization with indexes
- ✅ Comprehensive error handling
- ✅ Input validation with Zod schemas
- ✅ CSRF protection and rate limiting
- ✅ Mobile-responsive design
- ✅ Accessibility compliance (WCAG 2.1)

## Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis server (optional, for caching)
- Discord application for OAuth

### Quick Setup

1. **Run the installation script:**
   ```bash
   # Linux/macOS
   chmod +x scripts/install-voting-system.sh
   ./scripts/install-voting-system.sh
   
   # Windows
   scripts/install-voting-system.bat
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/oadro_radio"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   
   # Discord OAuth
   DISCORD_CLIENT_ID="your-discord-client-id"
   DISCORD_CLIENT_SECRET="your-discord-client-secret"
   
   # Redis (optional)
   REDIS_URL="redis://localhost:6379"
   
   # WebSocket
   NEXT_PUBLIC_WS_URL="http://localhost:3000"
   ```

3. **Set up the database:**
   ```bash
   npx prisma db push
   npx prisma db seed  # Optional: seed with sample data
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Database Schema

### Core Tables

#### Songs
```sql
model Song {
  id           String   @id @default(cuid())
  title        String
  artist       String
  likeCount    Int      @default(0)
  dislikeCount Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  votes            Vote[]
  dislikeFeedback  DislikeFeedback[]
  
  @@index([likeCount])
  @@index([dislikeCount])
  @@index([createdAt])
}
```

#### Users
```sql
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  image         String?
  discordId     String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  accounts        Account[]
  sessions        Session[]
  votes           Vote[]
  dislikeFeedback DislikeFeedback[]
}
```

#### Votes
```sql
model Vote {
  id        String   @id @default(cuid())
  userId    String
  songId    String
  voteType  VoteType
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)
  
  @@unique([userId, songId])
  @@index([songId])
  @@index([createdAt])
}
```

#### Dislike Feedback
```sql
model DislikeFeedback {
  id         String                @id @default(cuid())
  userId     String
  songId     String
  feedback   String
  category   DislikeFeedbackCategory @default(other)
  status     FeedbackStatus        @default(pending)
  adminNotes String?
  createdAt  DateTime              @default(now())
  updatedAt  DateTime              @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)
  
  @@unique([userId, songId])
  @@index([status])
  @@index([category])
  @@index([createdAt])
}
```

## API Endpoints

### Public Endpoints

#### Voting
- `POST /api/songs/{songId}/vote` - Submit or update vote
- `DELETE /api/songs/{songId}/vote` - Remove vote
- `GET /api/songs/{songId}/votes` - Get vote counts

#### Feedback
- `POST /api/votes/{voteId}/feedback` - Submit dislike feedback

### Admin Endpoints (Discord ID: 416034191369830402)

#### Analytics
- `GET /api/admin/analytics?timeRange=7d` - Get voting analytics
- `GET /api/admin/analytics/trending` - Get trending songs
- `GET /api/admin/analytics/songs/{songId}` - Get song-specific analytics
- `GET /api/admin/analytics/export?timeRange=7d` - Export analytics as CSV

#### Feedback Management
- `GET /api/admin/dislike-feedback` - Get all feedback
- `GET /api/admin/dislike-feedback/{feedbackId}` - Get specific feedback
- `PATCH /api/admin/dislike-feedback/{feedbackId}` - Update feedback status
- `DELETE /api/admin/dislike-feedback/{feedbackId}` - Delete feedback

## Components

### Voting Components
- `VotingButtons` - Main like/dislike interface
- `DislikeFeedbackModal` - Feedback collection modal
- `VoteDisplay` - Real-time vote count display

### Admin Components
- `AnalyticsDashboard` - Comprehensive analytics interface
- `DislikeFeedbackPanel` - Feedback management interface
- `TrendingDisplay` - Trending songs visualization

### UI Components
- `Button`, `Card`, `Badge` - Base UI components
- `Textarea`, `RadioGroup`, `Label` - Form components
- `Tabs` - Navigation component

## Real-time Features

### WebSocket Events

#### Client → Server
- `vote` - User submits a vote
- `join-room` - Join song-specific room

#### Server → Client
- `vote-update` - Vote count changed
- `dislike-feedback` - New feedback submitted (admin only)

### Usage Example
```typescript
import { useVotingWebSocket } from '@/hooks/use-websocket'

function VotingComponent() {
  const { isConnected, voteUpdates, sendVote } = useVotingWebSocket()
  
  const handleVote = (songId: string, voteType: 'like' | 'dislike') => {
    sendVote(songId, voteType)
  }
  
  return (
    <div>
      <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
      <button onClick={() => handleVote('song-id', 'like')}>
        Like
      </button>
    </div>
  )
}
```

## Caching Strategy

### Redis Cache Keys
- `vote_count:{songId}` - Vote counts (TTL: 5 minutes)
- `user_vote:{userId}:{songId}` - User votes (TTL: 1 hour)
- `trending_songs` - Trending song IDs (TTL: 15 minutes)

### Cache Invalidation
- Vote counts invalidated on vote changes
- User votes updated on vote submission
- Trending cache refreshed every 15 minutes

## Security Measures

### Authentication
- Discord OAuth 2.0 integration
- JWT token validation
- Session management with NextAuth.js

### Rate Limiting
- 10 votes per minute per user
- 100 API requests per minute per IP
- WebSocket connection limits

### Input Validation
- Zod schema validation for all inputs
- SQL injection prevention with Prisma
- XSS protection with input sanitization

### Admin Protection
- Hardcoded admin Discord ID verification
- Admin-only endpoint protection
- Audit logging for admin actions

## Performance Optimizations

### Database
- Optimized indexes on frequently queried columns
- Connection pooling with Prisma
- Efficient aggregation queries for analytics

### Caching
- Redis for frequently accessed data
- Browser caching for static assets
- CDN integration ready

### Frontend
- React.memo for component optimization
- Lazy loading for admin components
- Debounced user interactions

## Monitoring & Analytics

### Metrics Tracked
- Vote counts and ratios
- User engagement patterns
- Song popularity trends
- Feedback categorization
- System performance metrics

### Analytics Features
- Real-time dashboards
- Trending song detection
- User behavior analysis
- Controversial content identification
- CSV export for external analysis

## Deployment

### Environment Setup
1. Set up PostgreSQL database
2. Configure Redis server (optional)
3. Set up Discord OAuth application
4. Configure environment variables
5. Run database migrations

### Production Considerations
- Use connection pooling for database
- Set up Redis cluster for high availability
- Configure load balancing for WebSocket
- Enable HTTPS for secure authentication
- Set up monitoring and logging

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database connection
npx prisma db pull
```

#### Redis Connection
```bash
# Test Redis connection
redis-cli ping
```

#### Discord OAuth
- Verify client ID and secret
- Check redirect URLs in Discord app settings
- Ensure proper scopes are configured

#### WebSocket Issues
- Check firewall settings
- Verify WebSocket URL configuration
- Monitor connection logs

### Debug Mode
Enable debug logging:
```env
DEBUG=true
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit a pull request

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Comprehensive error handling
- Accessibility compliance

## License

This voting system is part of the OADRO Radio project and follows the same licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the GitHub issues
3. Contact the development team
4. Admin support: Discord ID 416034191369830402