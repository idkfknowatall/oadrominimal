import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test users
  const testUsers = [
    {
      discordId: '123456789012345678',
      username: 'TestUser1',
      discriminator: '0001',
      avatar: 'https://cdn.discordapp.com/avatars/123456789012345678/test1.png',
      isAdmin: true,
    },
    {
      discordId: '234567890123456789',
      username: 'TestUser2',
      discriminator: '0002',
      avatar: 'https://cdn.discordapp.com/avatars/234567890123456789/test2.png',
      isAdmin: false,
    },
    {
      discordId: '345678901234567890',
      username: 'TestUser3',
      discriminator: '0003',
      avatar: 'https://cdn.discordapp.com/avatars/345678901234567890/test3.png',
      isAdmin: false,
    },
  ]

  console.log('👥 Creating test users...')
  for (const userData of testUsers) {
    await prisma.user.upsert({
      where: { discordId: userData.discordId },
      update: userData,
      create: userData,
    })
  }

  // Create test songs
  const testSongs = [
    {
      songId: 'song_001',
      title: 'Electronic Dreams',
      artist: 'Synthwave Artist',
      albumArt: 'https://example.com/album1.jpg',
      genre: 'Electronic',
      duration: 240,
    },
    {
      songId: 'song_002',
      title: 'Rock Anthem',
      artist: 'Rock Band',
      albumArt: 'https://example.com/album2.jpg',
      genre: 'Rock',
      duration: 180,
    },
    {
      songId: 'song_003',
      title: 'Jazz Fusion',
      artist: 'Jazz Ensemble',
      albumArt: 'https://example.com/album3.jpg',
      genre: 'Jazz',
      duration: 320,
    },
    {
      songId: 'song_004',
      title: 'Pop Hit',
      artist: 'Pop Star',
      albumArt: 'https://example.com/album4.jpg',
      genre: 'Pop',
      duration: 200,
    },
    {
      songId: 'song_005',
      title: 'Classical Symphony',
      artist: 'Orchestra',
      albumArt: 'https://example.com/album5.jpg',
      genre: 'Classical',
      duration: 480,
    },
  ]

  console.log('🎵 Creating test songs...')
  for (const songData of testSongs) {
    await prisma.song.upsert({
      where: { songId: songData.songId },
      update: songData,
      create: songData,
    })
  }

  // Create some test votes
  console.log('👍 Creating test votes...')
  const users = await prisma.user.findMany()
  const songs = await prisma.song.findMany()

  // Add some likes and dislikes
  const voteData = [
    { userId: users[0].id, songId: songs[0].id, voteType: 'like' as const },
    { userId: users[1].id, songId: songs[0].id, voteType: 'like' as const },
    { userId: users[2].id, songId: songs[0].id, voteType: 'dislike' as const },
    { userId: users[0].id, songId: songs[1].id, voteType: 'like' as const },
    { userId: users[1].id, songId: songs[1].id, voteType: 'dislike' as const },
    { userId: users[0].id, songId: songs[2].id, voteType: 'like' as const },
    { userId: users[1].id, songId: songs[2].id, voteType: 'like' as const },
    { userId: users[2].id, songId: songs[2].id, voteType: 'like' as const },
    { userId: users[0].id, songId: songs[3].id, voteType: 'dislike' as const },
    { userId: users[1].id, songId: songs[4].id, voteType: 'like' as const },
  ]

  for (const vote of voteData) {
    await prisma.vote.upsert({
      where: {
        userId_songId: {
          userId: vote.userId,
          songId: vote.songId,
        },
      },
      update: { voteType: vote.voteType },
      create: vote,
    })
  }

  // Update song vote counts
  console.log('📊 Updating vote counts...')
  for (const song of songs) {
    const likeCount = await prisma.vote.count({
      where: { songId: song.id, voteType: 'like' },
    })
    const dislikeCount = await prisma.vote.count({
      where: { songId: song.id, voteType: 'dislike' },
    })

    await prisma.song.update({
      where: { id: song.id },
      data: {
        likeCount,
        dislikeCount,
        totalVotes: likeCount + dislikeCount,
      },
    })
  }

  // Create some dislike feedback
  console.log('💬 Creating test feedback...')
  const dislikeVotes = await prisma.vote.findMany({
    where: { voteType: 'dislike' },
    include: { user: true, song: true },
  })

  const feedbackData = [
    {
      voteId: dislikeVotes[0]?.id,
      userId: dislikeVotes[0]?.userId,
      songId: dislikeVotes[0]?.songId,
      reason: 'The song is too repetitive and lacks variety in the melody.',
      category: 'Musical Quality',
    },
    {
      voteId: dislikeVotes[1]?.id,
      userId: dislikeVotes[1]?.userId,
      songId: dislikeVotes[1]?.songId,
      reason: 'Audio quality is poor with noticeable distortion.',
      category: 'Technical Issues',
    },
  ]

  for (const feedback of feedbackData) {
    if (feedback.voteId && feedback.userId && feedback.songId) {
      await prisma.dislikeFeedback.create({
        data: feedback,
      })
    }
  }

  console.log('✅ Database seed completed successfully!')
  console.log(`Created ${users.length} users, ${songs.length} songs, and ${voteData.length} votes`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })