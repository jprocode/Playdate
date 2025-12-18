'use client';

import { useState } from 'react';
import { Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  roomId: string;
  password: string;
  trigger?: React.ReactNode;
}

export function ShareDialog({ roomId, password, trigger }: ShareDialogProps) {
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/join?roomId=${roomId}`
    : `/join?roomId=${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast({ title: 'Invite link copied!' });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedPassword(true);
      toast({ title: 'Password copied!' });
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleCopyAll = async () => {
    try {
      const text = `Join my PlayDate room!\n\nRoom Link: ${inviteLink}\nPassword: ${password}`;
      await navigator.clipboard.writeText(text);
      toast({ title: 'Invite details copied!' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my PlayDate room!',
          text: `Join my PlayDate room!\n\nPassword: ${password}`,
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          toast({ title: 'Failed to share', variant: 'destructive' });
        }
      }
    } else {
      handleCopyAll();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Invite
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a Friend</DialogTitle>
          <DialogDescription>
            Share these details with your friend to let them join your room
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Invite Link */}
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={inviteLink}
                  readOnly
                  className="pl-9 font-mono text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label>Room Password</Label>
            <div className="flex gap-2">
              <Input
                value={password}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyPassword}
              >
                {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your friend will need this password to join
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
          <Button className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;

