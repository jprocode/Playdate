'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, Minimize2, Maximize2, Loader2, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
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

// Video error state type
interface VideoErrorState {
  local: string | null;
  remote: string | null;
}

// Connection state display mapping
function getConnectionStateInfo(state: string): { text: string; color: string; icon: 'loading' | 'error' | 'offline' | 'none' } {
  switch (state) {
    case 'new':
    case 'initializing':
      return { text: 'Initializing...', color: 'text-blue-500', icon: 'loading' };
    case 'connecting':
      return { text: 'Connecting...', color: 'text-yellow-500', icon: 'loading' };
    case 'connected':
      return { text: 'Connected', color: 'text-green-500', icon: 'none' };
    case 'disconnected':
      return { text: 'Disconnected', color: 'text-orange-500', icon: 'offline' };
    case 'failed':
      return { text: 'Connection failed', color: 'text-red-500', icon: 'error' };
    case 'closed':
      return { text: 'Call ended', color: 'text-gray-500', icon: 'none' };
    default:
      return { text: 'Waiting...', color: 'text-muted-foreground', icon: 'none' };
  }
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
  // Separate refs for desktop and mobile to avoid conflicts
  const desktopLocalVideoRef = useRef<HTMLVideoElement>(null);
  const desktopRemoteVideoRef = useRef<HTMLVideoElement>(null);
  const mobileLocalVideoRef = useRef<HTMLVideoElement>(null);
  const mobileRemoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [videoError, setVideoError] = useState<VideoErrorState>({ local: null, remote: null });
  const [videoReady, setVideoReady] = useState({ local: false, remote: false });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const stateInfo = getConnectionStateInfo(connectionState);

  // Helper to play video with error handling
  const playVideoWithRetry = useCallback(async (video: HTMLVideoElement, type: 'local' | 'remote') => {
    if (!video || !video.srcObject) return;
    
    try {
      // Wait for video to be ready
      if (video.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            resolve();
          };
          const onError = () => {
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            reject(new Error('Video failed to load'));
          };
          video.addEventListener('canplay', onCanPlay);
          video.addEventListener('error', onError);
          // Timeout after 10 seconds
          setTimeout(() => {
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('error', onError);
            resolve(); // Try to play anyway
          }, 10000);
        });
      }

      await video.play();
      setVideoError(prev => ({ ...prev, [type]: null }));
      setVideoReady(prev => ({ ...prev, [type]: true }));
      console.log(`[VideoDock] ${type} video playing successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[VideoDock] ${type} video play failed:`, errorMessage);
      
      // Handle autoplay restrictions
      if (errorMessage.includes('interact') || errorMessage.includes('user gesture') || errorMessage.includes('NotAllowedError')) {
        setVideoError(prev => ({ ...prev, [type]: 'Click to play' }));
      } else {
        setVideoError(prev => ({ ...prev, [type]: 'Video error' }));
      }
    }
  }, []);

  // Handle video element errors
  const handleVideoError = useCallback((type: 'local' | 'remote') => (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const error = video.error;
    console.error(`[VideoDock] ${type} video error:`, error?.message || 'Unknown error');
    setVideoError(prev => ({ ...prev, [type]: error?.message || 'Video error' }));
  }, []);

  // Handle video loaded metadata
  const handleLoadedMetadata = useCallback((type: 'local' | 'remote') => (event: React.SyntheticEvent<HTMLVideoElement>) => {
    console.log(`[VideoDock] ${type} video metadata loaded`);
    const video = event.currentTarget;
    playVideoWithRetry(video, type);
  }, [playVideoWithRetry]);

  // Manual retry for video playback
  const retryVideoPlayback = useCallback((type: 'local' | 'remote') => {
    const videoRefs = type === 'local' 
      ? [desktopLocalVideoRef.current, mobileLocalVideoRef.current]
      : [desktopRemoteVideoRef.current, mobileRemoteVideoRef.current];
    
    videoRefs.forEach(video => {
      if (video) {
        playVideoWithRetry(video, type);
      }
    });
  }, [playVideoWithRetry]);

  // Set local video streams and play
  useEffect(() => {
    const setStreamAndPlay = async (video: HTMLVideoElement | null) => {
      if (video && localStream) {
        if (video.srcObject !== localStream) {
          video.srcObject = localStream;
          console.log('[VideoDock] Local stream assigned to video element');
        }
        // Give the video element time to process the new stream
        setTimeout(() => playVideoWithRetry(video, 'local'), 100);
      }
    };
    setStreamAndPlay(desktopLocalVideoRef.current);
    setStreamAndPlay(mobileLocalVideoRef.current);
  }, [localStream, playVideoWithRetry]);

  // Set remote video streams and play
  useEffect(() => {
    const setStreamAndPlay = async (video: HTMLVideoElement | null) => {
      if (video && remoteStream) {
        if (video.srcObject !== remoteStream) {
          video.srcObject = remoteStream;
          console.log('[VideoDock] Remote stream assigned to video element');
        }
        // Give the video element time to process the new stream
        setTimeout(() => playVideoWithRetry(video, 'remote'), 100);
      }
    };
    setStreamAndPlay(desktopRemoteVideoRef.current);
    setStreamAndPlay(mobileRemoteVideoRef.current);
  }, [remoteStream, playVideoWithRetry]);

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

  const handleDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPosition({
      x: clientX - dragStartRef.current.x,
      y: clientY - dragStartRef.current.y,
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

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
  }, [isDragging, handleDrag, handleDragEnd]);

  // Connection state indicator component
  const ConnectionIndicator = ({ className }: { className?: string }) => {
    if (connectionState === 'connected' && remoteStream) return null;
    
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {stateInfo.icon === 'loading' && (
          <Loader2 className={cn("h-3 w-3 animate-spin", stateInfo.color)} />
        )}
        {stateInfo.icon === 'error' && (
          <AlertCircle className={cn("h-3 w-3", stateInfo.color)} />
        )}
        {stateInfo.icon === 'offline' && (
          <WifiOff className={cn("h-3 w-3", stateInfo.color)} />
        )}
        <span className={cn("text-xs", stateInfo.color)}>{stateInfo.text}</span>
      </div>
    );
  };

  // Remote video placeholder with state info
  const RemoteVideoPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {videoError.remote ? (
        <>
          <AlertCircle className="h-8 w-8 text-orange-500" />
          <p className="text-xs text-center px-2 text-orange-500">{videoError.remote}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => retryVideoPlayback('remote')}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </>
      ) : stateInfo.icon === 'loading' ? (
        <Loader2 className={cn("h-8 w-8 animate-spin", stateInfo.color)} />
      ) : stateInfo.icon === 'error' ? (
        <AlertCircle className={cn("h-8 w-8", stateInfo.color)} />
      ) : stateInfo.icon === 'offline' ? (
        <WifiOff className={cn("h-8 w-8", stateInfo.color)} />
      ) : (
        <Video className="h-8 w-8 text-muted-foreground" />
      )}
      {!videoError.remote && (
        <p className={cn("text-xs text-center px-2", stateInfo.color)}>
          {stateInfo.text}
        </p>
      )}
    </div>
  );

  // Local video placeholder with error state
  const LocalVideoPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {videoError.local ? (
        <>
          <AlertCircle className="h-8 w-8 text-orange-500" />
          <p className="text-xs text-center px-2 text-orange-500">{videoError.local}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => retryVideoPlayback('local')}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </>
      ) : (
        <VideoOff className="h-8 w-8 text-muted-foreground" />
      )}
    </div>
  );

  // Desktop view - side panel
  const DesktopView = () => (
    <div className="hidden md:flex flex-col w-64 border-l bg-background p-4 space-y-4">
      {/* Connection status bar */}
      {connectionState !== 'connected' && (
        <div className={cn(
          "px-3 py-2 rounded-lg text-center",
          connectionState === 'failed' ? 'bg-red-100 dark:bg-red-900/20' :
          connectionState === 'connecting' || connectionState === 'initializing' ? 'bg-blue-100 dark:bg-blue-900/20' :
          'bg-muted'
        )}>
          <ConnectionIndicator className="justify-center" />
        </div>
      )}

      {/* Remote video */}
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        <video
          ref={desktopRemoteVideoRef}
          autoPlay
          playsInline
          onError={handleVideoError('remote')}
          onLoadedMetadata={handleLoadedMetadata('remote')}
          onClick={() => videoError.remote && retryVideoPlayback('remote')}
          className={cn(
            "w-full h-full object-cover cursor-pointer",
            (!remoteStream || videoError.remote) && "hidden"
          )}
        />
        {(!remoteStream || (remoteStream && videoError.remote)) && <RemoteVideoPlaceholder />}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
          {peerDisplayName || 'Partner'}
        </div>
        {connectionState === 'connected' && remoteStream && videoReady.remote && !videoError.remote && (
          <div className="absolute top-2 left-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Local video */}
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        <video
          ref={desktopLocalVideoRef}
          autoPlay
          playsInline
          muted
          onError={handleVideoError('local')}
          onLoadedMetadata={handleLoadedMetadata('local')}
          onClick={() => videoError.local && retryVideoPlayback('local')}
          className={cn(
            "w-full h-full object-cover transform scale-x-[-1] cursor-pointer",
            (!localStream || !isVideoEnabled || videoError.local) && "hidden"
          )}
        />
        {(!localStream || !isVideoEnabled || (localStream && videoError.local)) && (
          <LocalVideoPlaceholder />
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
        // Minimized state - just a button with status indicator
        <div className="relative">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setIsMinimized(false)}
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
          {connectionState === 'connected' && remoteStream && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          )}
          {(connectionState === 'connecting' || connectionState === 'initializing') && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-background animate-pulse" />
          )}
          {connectionState === 'failed' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
          )}
        </div>
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
            <div className="flex items-center gap-1">
              {connectionState === 'connected' && remoteStream && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
              <span className="text-xs font-medium truncate">
                {peerDisplayName || 'Partner'}
              </span>
            </div>
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
            <video
              ref={mobileRemoteVideoRef}
              autoPlay
              playsInline
              onError={handleVideoError('remote')}
              onLoadedMetadata={handleLoadedMetadata('remote')}
              onClick={() => videoError.remote && retryVideoPlayback('remote')}
              className={cn(
                "w-full h-full object-cover",
                (!remoteStream || videoError.remote) && "hidden"
              )}
            />
            {(!remoteStream || (remoteStream && videoError.remote)) && (
              <div className="flex flex-col items-center justify-center h-full">
                {videoError.remote ? (
                  <>
                    <AlertCircle className="h-6 w-6 text-orange-500" />
                    <span className="text-[10px] mt-1 text-orange-500">Tap to retry</span>
                  </>
                ) : stateInfo.icon === 'loading' ? (
                  <Loader2 className={cn("h-6 w-6 animate-spin", stateInfo.color)} />
                ) : (
                  <Video className="h-6 w-6 text-muted-foreground" />
                )}
                {!videoError.remote && (
                  <span className={cn("text-[10px] mt-1", stateInfo.color)}>{stateInfo.text}</span>
                )}
              </div>
            )}
          </div>

          {/* Local video (small overlay) */}
          <div className="absolute bottom-12 right-2 w-12 aspect-video bg-muted rounded overflow-hidden border shadow-sm">
            <video
              ref={mobileLocalVideoRef}
              autoPlay
              playsInline
              muted
              onError={handleVideoError('local')}
              onLoadedMetadata={handleLoadedMetadata('local')}
              onClick={() => videoError.local && retryVideoPlayback('local')}
              className={cn(
                "w-full h-full object-cover transform scale-x-[-1]",
                (!localStream || !isVideoEnabled || videoError.local) && "hidden"
              )}
            />
            {(!localStream || !isVideoEnabled || (localStream && videoError.local)) && (
              <div className="flex items-center justify-center h-full">
                {videoError.local ? (
                  <AlertCircle className="h-3 w-3 text-orange-500" />
                ) : (
                  <VideoOff className="h-3 w-3 text-muted-foreground" />
                )}
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
