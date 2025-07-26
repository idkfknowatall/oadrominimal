/**
 * Shared authentication error message utility
 * Provides consistent error messages across auth pages
 */

export function getAuthErrorMessage(error: string | null): string {
  if (!error) return 'An unknown error occurred during authentication.'

  switch (error) {
    case 'Configuration':
      return 'There is a problem with the server configuration. Please contact support.'
    case 'AccessDenied':
      return 'Access denied. You do not have permission to sign in.'
    case 'Verification':
      return 'The verification token has expired or has already been used.'
    case 'OAuthSignin':
      return 'There was an error signing in with Discord. Please try again.'
    case 'OAuthCallback':
      return 'Discord authentication failed. Please check your permissions and try again.'
    case 'OAuthCreateAccount':
      return 'Could not create your account. Please try again or contact support.'
    case 'EmailCreateAccount':
      return 'Could not create account with this email address.'
    case 'Callback':
      return 'Authentication callback failed. Please try again.'
    case 'OAuthAccountNotLinked':
      return 'This Discord account is not linked to any existing account.'
    case 'EmailSignin':
      return 'Check your email for a sign-in link.'
    case 'CredentialsSignin':
      return 'Invalid credentials. Please check your details and try again.'
    case 'SessionRequired':
      return 'Please sign in to access this page.'
    case 'Default':
      return 'An error occurred during authentication. Please try again.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}