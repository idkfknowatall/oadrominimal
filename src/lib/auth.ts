import { NextAuthOptions, getServerSession } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './database';
import { ADMIN_DISCORD_ID } from './voting-types';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider === 'discord' && profile) {
        try {
          // Update or create user in our database
          const discordProfile = profile as any;
          await prisma.user.upsert({
            where: { discordId: discordProfile.id },
            update: {
              username: discordProfile.username,
              discriminator: discordProfile.discriminator,
              avatar: discordProfile.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
                : null,
              isAdmin: discordProfile.id === ADMIN_DISCORD_ID,
            },
            create: {
              discordId: discordProfile.id,
              username: discordProfile.username,
              discriminator: discordProfile.discriminator,
              avatar: discordProfile.avatar 
                ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
                : null,
              isAdmin: discordProfile.id === ADMIN_DISCORD_ID,
            },
          });
        } catch (error) {
          console.error('Error updating user in database:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }: any) {
      if (token.sub) {
        try {
          const user = await prisma.user.findUnique({
            where: { discordId: token.sub },
          });
          
          if (user) {
            session.user.id = user.id.toString();
            session.user.discordId = user.discordId;
            session.user.isAdmin = user.isAdmin;
          }
        } catch (error) {
          console.error('Error fetching user session:', error);
        }
      }
      return session;
    },
    async jwt({ token, account, profile }: any) {
      if (account?.provider === 'discord' && profile) {
        token.sub = (profile as any).id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper function to get user from session
export async function getCurrentUser(req: any) {
  try {
    const session = await getServerSession(req, authOptions);
    if (!session?.user?.discordId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { discordId: session.user.discordId },
    });

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Helper function to check if user is admin
export function isAdmin(user: any): boolean {
  return user?.isAdmin === true || user?.discordId === ADMIN_DISCORD_ID;
}

// Helper function to validate user authentication
export async function validateAuth(req: any) {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Helper function to validate admin authentication
export async function validateAdminAuth(req: any) {
  const user = await validateAuth(req);
  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
  return user;
}