import { useEffect } from 'react';

export function Favicon() {
  useEffect(() => {
    // Create SVG favicon with TaskBase branding
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="6" fill="rgb(126, 61, 212)"/>
        <text x="16" y="23" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">T</text>
      </svg>
    `;
    
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    // Remove existing favicons
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach(link => link.remove());
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = url;
    document.head.appendChild(link);
    
    // Also set the title
    document.title = 'TaskBase';
    
    // Cleanup
    return () => {
      URL.revokeObjectURL(url);
    };
  }, []);
  
  return null;
}
