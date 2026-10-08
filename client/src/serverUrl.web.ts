// Production Compose exports a relocatable web bundle: HTTP and Socket.IO use the page origin.
export const serverURL = process.env.EXPO_PUBLIC_SERVER_URL === 'same-origin'
  ? (typeof window === 'undefined' ? '' : window.location.origin)
  : process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';
