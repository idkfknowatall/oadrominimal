'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, User, LogOut } from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  avatar: string;
  avatarUrl: string;
}

export default function DiscordTestPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'not_authenticated'>('checking');

  // Check authentication status on page load
  useEffect(() => {
    checkAuthStatus();
    
    // Check for auth success/error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('auth');
    const errorResult = urlParams.get('error');
    
    if (authResult === 'success') {
      setError(null);
      // Refresh user data after successful auth
      setTimeout(() => checkAuthStatus(), 500);
    } else if (errorResult) {
      setError(`Authentication failed: ${errorResult}`);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/user');
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setAuthStatus('not_authenticated');
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setError('Failed to check authentication status');
      setAuthStatus('not_authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/discord/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/discord/logout', { method: 'POST' });
      setUser(null);
      setAuthStatus('not_authenticated');
      setError(null);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed');
    }
  };

  const getStatusIcon = () => {
    switch (authStatus) {
      case 'authenticated':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'not_authenticated':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    switch (authStatus) {
      case 'authenticated':
        return 'Authenticated';
      case 'not_authenticated':
        return 'Not Authenticated';
      default:
        return 'Checking...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Discord OAuth Test
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Test the Discord authentication flow for OADRO Radio
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={authStatus === 'authenticated' ? 'default' : 'secondary'}>
                  {getStatusText()}
                </Badge>
              </div>
              
              {loading && (
                <div className="text-sm text-gray-500">
                  Checking authentication status...
                </div>
              )}
              
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Info Card */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Image
                    src={user.avatarUrl}
                    alt={`${user.username}'s avatar`}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-gray-500">ID: {user.id}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {authStatus === 'not_authenticated' ? (
                <Button onClick={handleLogin} className="w-full" size="lg">
                  Login with Discord
                </Button>
              ) : (
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              )}
              
              <Button 
                onClick={checkAuthStatus} 
                variant="secondary" 
                className="w-full"
                disabled={loading}
              >
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Client ID:</span>
                <span className="font-mono">1378094738690805801</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Redirect URI:</span>
                <span className="font-mono">http://localhost:3000/api/auth/callback</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Scopes:</span>
                <span className="font-mono">identify</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Before testing, ensure your Discord application is configured:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                  <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="underline">Discord Developer Portal</a></li>
                  <li>Select your application (Client ID: 1378094738690805801)</li>
                  <li>Go to OAuth2 → General</li>
                  <li>Add redirect URI: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://localhost:3000/api/auth/callback</code></li>
                  <li>Copy the Client Secret and add it to your .env.local file</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}