import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Check for required environment variables
if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error('Missing VITE_GEMINI_API_KEY environment variable');
}

// PWA install prompt
let deferredPrompt: any;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install notification
  const notification = document.createElement('div');
  notification.className = 'pwa-install-prompt';
  notification.innerHTML = `
    <div class="pwa-prompt-content">
      <img src="/android-chrome-192x192.png" alt="AI Health" width="32" height="32">
      <span>Install AI Health for a better experience</span>
      <button id="pwa-install-btn">Install</button>
      <button id="pwa-dismiss-btn">✕</button>
    </div>
  `;
  document.body.appendChild(notification);

  // Handle install button click
  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredPrompt = null;
    }
    notification.remove();
  });

  // Handle dismiss button click
  document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
    notification.remove();
  });
});

// Add styles for the install prompt
const style = document.createElement('style');
style.textContent = `
  .pwa-install-prompt {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    animation: slideUp 0.3s ease-out;
  }

  .pwa-prompt-content {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
  }

  .pwa-prompt-content img {
    border-radius: 8px;
  }

  .pwa-prompt-content span {
    flex: 1;
    font-size: 14px;
    color: #1e293b;
  }

  #pwa-install-btn {
    background: #0284c7;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
  }

  #pwa-install-btn:hover {
    background: #0369a1;
  }

  #pwa-dismiss-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
  }

  #pwa-dismiss-btn:hover {
    background: #f1f5f9;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @media (min-width: 640px) {
    .pwa-install-prompt {
      max-width: 400px;
      left: auto;
    }
  }

  @media (prefers-color-scheme: dark) {
    .pwa-install-prompt {
      background: #1e293b;
    }
    .pwa-prompt-content span {
      color: #f8fafc;
    }
    #pwa-dismiss-btn {
      color: #94a3b8;
    }
    #pwa-dismiss-btn:hover {
      background: #334155;
    }
  }
`;
document.head.appendChild(style);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('ServiceWorker registration successful:', registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, refresh to update
              if (confirm('New content is available! Would you like to refresh?')) {
                window.location.reload();
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });

  // Handle service worker updates
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
