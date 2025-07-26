// NextAuth type extensions
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string
      discriminator?: string
      avatar?: string
    }
  }

  interface User {
    id: string
    username?: string
    discriminator?: string
    avatar?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    discordId?: string
    username?: string
    discriminator?: string
    avatar?: string
  }
}