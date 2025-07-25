# Discord OAuth Integration Guide for oadro.com

## How the Discord Voting System Works

### 🎯 **User Experience Flow**

1. **User visits oadro.com** → Sees the radio player with voting interface
2. **Voting interface shows** → "Login with Discord to vote on songs" message
3. **User clicks "Login with Discord"** → Redirected to Discord OAuth
4. **Discord OAuth** → User authorizes your app to access their Discord profile
5. **User returns to oadro.com** → Now authenticated and can vote on songs
6. **Voting enabled** → User can like/dislike songs, see real-time vote counts

### 🔧 **Current Implementation Status**

Your voting system is **ready** but needs Discord OAuth integration. Currently:
- ✅ All voting components are built and functional
- ✅ Firebase backend is configured
- ✅ Security rules are in place
- ❌ Discord OAuth is not yet implemented (shows placeholder)

## 🚀 **Complete Discord OAuth Setup**

### **Step 1: Create Discord Application**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "OADRO Radio" (or your preferred name)
4. Go to "OAuth2" tab
5. Add redirect URI: `https://oadro.com/api/auth/callback/discord`
6. Copy your **Client ID** and **Client Secret**

### **Step 2: Install Authentication Package**

```bash
npm install next-auth @auth/firebase-adapter
```

### **Step 3: Environment Variables**

Add to your `.env.local`:

```env
# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here

# NextAuth
NEXTAUTH_URL=https://oadro.com
NEXTAUTH_SECRET=your_random_secret_here_32_chars_min

# Firebase (already configured)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### **Step 4: Create Authentication API Route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { FirestoreAdapter } from '@auth/firebase-adapter'
import { getFirestore } from '@/lib/firebase'

const handler = NextAuth({
  adapter: FirestoreAdapter(getFirestore()),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})

export { handler as GET, handler as POST }
```

### **Step 5: Create Authentication Hook**

Create `src/hooks/use-auth.ts`:

```typescript
'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useMemo } from 'react'
import type { DiscordUser } from '@/lib/types'

export interface UseAuthReturn {
  user: DiscordUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()

  const user = useMemo((): DiscordUser | null => {
    if (!session?.user) return null

    return {
      id: session.user.id!,
      username: session.user.name || 'Unknown',
      avatar: session.user.image || null,
      discriminator: '0000', // Discord removed discriminators
    }
  }, [session])

  const login = () => signIn('discord')
  const logout = () => signOut()

  return {
    user,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    login,
    logout,
  }
}
```

### **Step 6: Update Root Layout**

Update `src/app/layout.tsx`:

```typescript
import { SessionProvider } from 'next-auth/react'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './api/auth/[...nextauth]/route'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

### **Step 7: Update Audio Player with Authentication**

Update `src/components/audio-player-simple.tsx`:

```typescript
import { useAuth } from '@/hooks/use-auth'

export default function AudioPlayerSimple() {
  const { user, isAuthenticated, login } = useAuth()

  return (
    <div className="audio-player">
      {/* ... other components ... */}
      
      <div className="mb-6">
        <SongVoteDisplay 
          user={user}
          isAuthenticated={isAuthenticated}
          onLoginRequired={login}
        />
      </div>
    </div>
  )
}
```

### **Step 8: Create Sign-In Page**

Create `src/app/auth/signin/page.tsx`:

```typescript
'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DiscordIcon } from '@/components/icons'

export default function SignIn() {
  const [providers, setProviders] = useState<any>(null)

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    setAuthProviders()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Sign in to OADRO</h2>
          <p className="mt-2 text-muted-foreground">
            Vote on songs and join the community
          </p>
        </div>
        
        {providers && (
          <div className="space-y-4">
            {Object.values(providers).map((provider: any) => (
              <Button
                key={provider.name}
                onClick={() => signIn(provider.id)}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
                size="lg"
              >
                <DiscordIcon className="w-5 h-5 mr-2" />
                Continue with {provider.name}
              </Button>
            ))}
          </div>
        )}
        
        <div className="text-center">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Radio
          </a>
        </div>
      </div>
    </div>
  )
}
```

## 🌐 **Deployment to oadro.com**

### **Option 1: Vercel (Recommended)**

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

2. **Add Environment Variables in Vercel:**
   - Go to your Vercel dashboard
   - Project Settings → Environment Variables
   - Add all your environment variables

3. **Custom Domain:**
   - In Vercel dashboard → Domains
   - Add `oadro.com` and `www.oadro.com`
   - Update DNS records as instructed

### **Option 2: Your Dedicated Server**

1. **Server Requirements:**
   - Node.js 18+
   - PM2 for process management
   - Nginx for reverse proxy
   - SSL certificate for HTTPS

2. **Deploy Commands:**
   ```bash
   # On your server
   git clone your-repo
   cd oadrominimal
   npm install
   npm run build
   pm2 start ecosystem.config.js --env production
   ```

3. **Nginx Configuration:**
   ```nginx
   server {
       listen 443 ssl;
       server_name oadro.com www.oadro.com;
       
       ssl_certificate /path/to/your/certificate.crt;
       ssl_certificate_key /path/to/your/private.key;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔐 **Security Checklist**

- [ ] HTTPS enabled on oadro.com
- [ ] Environment variables secured
- [ ] Firebase security rules deployed
- [ ] Discord OAuth redirect URI matches exactly
- [ ] NEXTAUTH_SECRET is random and secure
- [ ] Rate limiting configured

## 🎉 **Final Result**

After setup, users will experience:

1. **Visit oadro.com** → See radio player
2. **Click "Login with Discord"** → Redirect to Discord
3. **Authorize app** → Return to oadro.com as authenticated user
4. **Vote on songs** → Real-time voting with live updates
5. **See vote counts** → Live updates across all users

The voting system will be fully functional with:
- ✅ Discord authentication
- ✅ Real-time vote synchronization
- ✅ Offline support
- ✅ Mobile responsive
- ✅ Performance optimized
- ✅ Secure and scalable

## 📞 **Need Help?**

If you need assistance with:
- Discord app setup
- Server deployment
- DNS configuration
- SSL certificate setup

Let me know and I can provide specific guidance for your setup!