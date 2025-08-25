// Account to logo mapping utility
export function getLogoForUser(userEmail?: string): {
  src: string
  alt: string
} {
  const accountToLogoMap: Record<string, { src: string; alt: string }> = {
    'hunt@vertriqe.com': {
      src: '/images/the-hunt-logo.png',
      alt: 'The Hunt Logo'
    },
    // Default fallback for all other users
    default: {
      src: '/images/vertriqe-logo.png',
      alt: 'VERTRIQE Logo'
    }
  }

  return accountToLogoMap[userEmail || ''] || accountToLogoMap.default
}