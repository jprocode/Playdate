'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Minimize2, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface VideoDockProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  connectionState: string;
  peerDisplayName: string;
}

export function VideoDock({
  localStream,
  remoteStream,
  isVideoEnabled,
  isAudioEnabled,
  isScreenSharing,
  onToggleVideo,
  onToggleAudio,
  onStartScreenShare,
  onStopScreenShare,
  connectionState,
  peerDisplayName,
}: VideoDockProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Handle dragging for mobile
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDrag);
      document.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDrag);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Desktop view - side panel
  const DesktopView = () => (
    <div className="hidden md:flex flex-col w-64 border-l bg-background p-4 space-y-4">
      {/* Remote video */}
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Video className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {connectionState === 'connecting' ? 'Connecting...' : 'Waiting for partner'}
              </p>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
          {peerDisplayName || 'Partner'}
        </div>
      </div>

      {/* Local video */}
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {localStream && isVideoEnabled ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <VideoOff className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
          You
        </div>
        {!isAudioEnabled && (
          <div className="absolute top-2 right-2">
            <MicOff className="h-4 w-4 text-red-500" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        <Button
          variant={isVideoEnabled ? 'secondary' : 'destructive'}
          size="icon"
          onClick={onToggleVideo}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button
          variant={isAudioEnabled ? 'secondary' : 'destructive'}
          size="icon"
          onClick={onToggleAudio}
          title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button
          variant={isScreenSharing ? 'destructive' : 'secondary'}
          size="icon"
          onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  // Mobile view - floating draggable tile
  const MobileView = () => (
    <div
      className={cn(
        'md:hidden fixed z-50 transition-all duration-200',
        isDragging && 'transition-none'
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {isMinimized ? (
        // Minimized state - just a button
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setIsMinimized(false)}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      ) : (
        // Expanded state - floating video tile
        <div
          className="bg-background border rounded-lg shadow-lg overflow-hidden"
          style={{ width: '160px' }}
        >
          {/* Header with drag handle */}
          <div
            className="flex items-center justify-between px-2 py-1 bg-muted cursor-move"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <span className="text-xs font-medium truncate">
              {peerDisplayName || 'Partner'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Remote video */}
          <div className="relative aspect-video bg-muted">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Local video (small overlay) */}
          <div className="absolute bottom-12 right-2 w-12 aspect-video bg-muted rounded overflow-hidden border shadow-sm">
            {localStream && isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <VideoOff className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Quick controls */}
          <div className="flex justify-center gap-1 p-1 bg-muted/50">
            <Button
              variant={isVideoEnabled ? 'ghost' : 'destructive'}
              size="icon"
              className="h-7 w-7"
              onClick={onToggleVideo}
            >
              {isVideoEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
            </Button>
            <Button
              variant={isAudioEnabled ? 'ghost' : 'destructive'}
              size="icon"
              className="h-7 w-7"
              onClick={onToggleAudio}
            >
              {isAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <DesktopView />
      <MobileView />
    </>
  );
}

export default VideoDock;

