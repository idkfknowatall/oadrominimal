'use client'

import { useEffect, useState } from 'react'

export function FirebaseDebug() {
  const [envVars, setEnvVars] = useState<Record<string, string | undefined>>({})

  useEffect(() => {
    const vars = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
    setEnvVars(vars)
    console.log('Firebase env vars:', vars)
  }, [])

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold mb-2">Firebase Environment Variables Debug:</h3>
      {Object.entries(envVars).map(([key, value]) => (
        <div key={key} className="text-sm">
          <strong>{key}:</strong> {value ? '✅ Set' : '❌ Missing'}
        </div>
      ))}
    </div>
  )
}