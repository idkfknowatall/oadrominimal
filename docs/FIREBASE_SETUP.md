# Firebase Setup Guide

This guide explains how to set up Firebase for the Discord Voting System.

## Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Firestore Database enabled in your Firebase project
3. Firebase Authentication configured (if not already done)

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Optional: Firebase Emulator (Development Only)
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
NEXT_PUBLIC_FIREBASE_EMULATOR_PORT=8080
```

## Getting Firebase Configuration Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon (Project Settings)
4. Scroll down to "Your apps" section
5. Click on your web app or create a new one
6. Copy the configuration values from the `firebaseConfig` object

## Firestore Database Setup

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll deploy security rules later)
4. Select a location for your database

## Security Rules Deployment

The project includes Firestore security rules in `firestore.rules`. To deploy them:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Initialize Firebase in your project: `firebase init firestore`
4. Deploy the rules: `firebase deploy --only firestore:rules`

## Collections Structure

The voting system uses two Firestore collections:

### `votes` Collection
- Document ID: Auto-generated
- Fields:
  - `songId` (string): AzuraCast song ID
  - `userId` (string): Discord user ID
  - `voteType` (string): 'like' or 'dislike'
  - `timestamp` (number): Unix timestamp
  - `songTitle` (string): Song title (denormalized)
  - `songArtist` (string): Song artist (denormalized)

### `vote-aggregates` Collection
- Document ID: Same as `songId`
- Fields:
  - `songId` (string): AzuraCast song ID
  - `likes` (number): Total like votes
  - `dislikes` (number): Total dislike votes
  - `totalVotes` (number): Total votes
  - `lastUpdated` (number): Unix timestamp
  - `songTitle` (string): Song title (denormalized)
  - `songArtist` (string): Song artist (denormalized)

## Development with Firebase Emulator

For local development, you can use the Firebase Emulator:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Start the emulator: `firebase emulators:start --only firestore`
3. Set environment variables:
   ```bash
   NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
   NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=localhost
   NEXT_PUBLIC_FIREBASE_EMULATOR_PORT=8080
   ```

## Testing

Run Firebase-related tests:

```bash
npm test -- --testPathPatterns=firebase
```

## Troubleshooting

### Common Issues

1. **"Missing required Firebase environment variables"**
   - Ensure all required environment variables are set in `.env.local`
   - Check that variable names match exactly (including `NEXT_PUBLIC_` prefix)

2. **"Firebase initialization failed"**
   - Verify your Firebase project configuration
   - Check that the project ID exists and is accessible

3. **"Permission denied" errors**
   - Ensure Firestore security rules are deployed
   - Verify user authentication is working correctly

4. **Emulator connection issues**
   - Make sure Firebase emulator is running
   - Check that emulator host and port match your configuration

### Getting Help

- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review the security rules in `firestore.rules`
- Run tests to verify configuration: `npm test -- --testPathPatterns=firebase`