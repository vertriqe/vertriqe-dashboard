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
    'weave@vertriqe.com': {
      src: '/images/weave-logo.png',
      alt: 'Weave Studio Logo'
    },
    'coffee@vertriqe.com': {
      src: '/images/about-coffee-logo.png',
      alt: 'Empty Image Placeholder'
    },
    'tnl@vertriqe.com': {
      src: 'https://webbox.imgix.net/images/rspdtnubdzcdfmnt/bf65e1c6-a69e-4b58-aa25-464dc4c3dd57.png?auto=format,compress&fit=crop&h=70',
      alt: 'TNL Logo'
    },
    // Default fallback for all other users
    default: {
      src: '/images/vertriqe-logo.png',
      alt: 'VERTRIQE Logo'
    }
  }

  return accountToLogoMap[userEmail || ''] || accountToLogoMap.default
}