'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Pre-fill room ID from URL
  useEffect(() => {
    const urlRoomId = searchParams.get('roomId');
    if (urlRoomId) {
      setRoomId(urlRoomId);
    }
  }, [searchParams]);

  const handleJoinRoom = async () => {
    if (!displayName.trim()) {
      toast({ title: 'Please enter a display name', variant: 'destructive' });
      return;
    }
    if (!roomId.trim()) {
      toast({ title: 'Please enter a room ID', variant: 'destructive' });
      return;
    }
    if (!password.trim()) {
      toast({ title: 'Please enter the room password', variant: 'destructive' });
      return;
    }

    setIsJoining(true);
    
    // Store credentials in session storage for the room page
    sessionStorage.setItem(`room-${roomId}`, JSON.stringify({
      displayName: displayName.trim(),
      password,
      isHost: false,
    }));
    
    toast({ title: 'Joining room...' });
    router.push(`/room/${roomId}`);
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
            <CardTitle>Join Room</CardTitle>
          </div>
          <CardDescription>
            Enter the room details shared by your friend
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
            <Input
              id="roomId"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Room Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Join Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleJoinRoom}
            disabled={isJoining || !displayName.trim() || !roomId.trim() || !password.trim()}
          >
            {isJoining ? 'Joining...' : 'Join Room'}
          </Button>

          {/* Create Room Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have a room?{' '}
            <Link href="/create" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

