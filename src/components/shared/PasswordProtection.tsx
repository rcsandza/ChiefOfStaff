import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface PasswordProtectionProps {
  children: React.ReactNode;
  correctPassword?: string;
}

export function PasswordProtection({ children, correctPassword = 'taskflow2024' }: PasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    // Check if user has already authenticated
    const authenticated = localStorage.getItem('app_authenticated');
    if (authenticated === 'true') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === correctPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('app_authenticated', 'true');
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  };
  
  // Show nothing while checking localStorage
  if (isChecking) {
    return null;
  }
  
  // Show password prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div 
          className="w-full max-w-md bg-card border border-border p-8 shadow-lg"
          style={{ borderRadius: 'var(--radius-card)' }}
        >
          <div className="flex flex-col items-center mb-6">
            <div 
              className="w-16 h-16 bg-primary/10 flex items-center justify-center mb-4"
              style={{ borderRadius: 'var(--radius)' }}
            >
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-center mb-2">Welcome to TaskBase</h1>
            <p className="text-center text-muted-foreground" style={{ fontSize: 'var(--text-sm)' }}>
              Enter the password to access your tasks
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter password"
                className="w-full"
                style={{ borderRadius: 'var(--radius-input)' }}
                autoFocus
              />
              {error && (
                <p className="text-destructive mt-2" style={{ fontSize: 'var(--text-sm)' }}>
                  {error}
                </p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              style={{ borderRadius: 'var(--radius-button)' }}
            >
              Unlock
            </Button>
          </form>
          
          <p className="text-muted-foreground text-center mt-6" style={{ fontSize: 'var(--text-xs)' }}>
            Your session will be saved locally
          </p>
        </div>
      </div>
    );
  }
  
  // Show main app if authenticated
  return <>{children}</>;
}
