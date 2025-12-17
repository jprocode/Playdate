'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Generate a random room ID (will be replaced with NanoID from server)
function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate a random password
function generatePassword(): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const all = lower + upper + numbers;
  
  // Ensure at least one of each type
  let result = '';
  result += lower.charAt(Math.floor(Math.random() * lower.length));
  result += upper.charAt(Math.floor(Math.random() * upper.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  // Fill the rest
  for (let i = 3; i < 12; i++) {
    result += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  // Shuffle
  return result.split('').sort(() => Math.random() - 0.5).join('');
}

export default function CreateRoomPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState(generateRoomId);
  const [password, setPassword] = useState(generatePassword);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/join?roomId=${roomId}`
    : `/join?roomId=${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: 'Invite link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast({ title: 'Password copied!' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCreateRoom = async () => {
    if (!displayName.trim()) {
      toast({ title: 'Please enter a display name', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    
    // Store credentials in session storage for the room page
    sessionStorage.setItem(`room-${roomId}`, JSON.stringify({
      displayName: displayName.trim(),
      password,
      isHost: true,
    }));
    
    toast({ title: 'Room created! Waiting for partner...' });
    router.push(`/room/${roomId}?host=true`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <CardTitle>Create Room</CardTitle>
          </div>
          <CardDescription>
            Create a private room and invite your friend to play
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Your Display Name</Label>
            <Input
              id="displayName"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
            />
          </div>

          {/* Room ID */}
          <div className="space-y-2">
            <Label htmlFor="roomId">Room ID</Label>
            <div className="flex gap-2">
              <Input
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setRoomId(generateRoomId())}
                title="Generate new ID"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Room Password</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
                title="Generate new password"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyPassword}
                title="Copy password"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this password with your friend
            </p>
          </div>

          {/* Invite Link */}
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Create Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreateRoom}
            disabled={isCreating || !displayName.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

