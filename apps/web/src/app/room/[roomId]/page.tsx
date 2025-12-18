'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Video, VideoOff, Mic, MicOff, Phone, Monitor, MonitorOff, MessageCircle, Gamepad2, Share2 } from 'lucide-react';

import type {
  RoomJoinedPayload,
  RoomWaitingPayload,
  RoomReadyPayload,
  RoomClosedPayload,
  RoomPeerDisconnectedPayload,
  PlayerRole,
  RoomState,
  GameStartPayload,
} from '@playdate/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useSocket, useSocketEvent, useSocketEmit } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoDock } from '@/components/room/VideoDock';
import { Chat } from '@/components/room/Chat';
import { GameLauncher } from '@/components/room/GameLauncher';
import { GameContainer } from '@/components/games';
import { ShareDialog } from '@/components/ui/share-dialog';
import type { GameKey } from '@playdate/shared';

type RoomStatus = 'connecting' | 'waiting' | 'ready' | 'disconnected' | 'closed' | 'error';

interface RoomPageState {
  status: RoomStatus;
  role: PlayerRole | null;
  peerDisplayName: string | null;
  roomState: RoomState | null;
  errorMessage: string | null;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const isHost = searchParams.get('host') === 'true';
  const { toast } = useToast();
  
  const { socket, isConnected } = useSocket({ autoConnect: true });
  const emit = useSocketEmit();

  const [state, setState] = useState<RoomPageState>({
    status: 'connecting',
    role: null,
    peerDisplayName: null,
    roomState: null,
    errorMessage: null,
  });

  const [controls, setControls] = useState({
    isChatOpen: false,
    isGameLauncherOpen: false,
  });

  const [currentGame, setCurrentGame] = useState<GameKey | null>(null);

  // Initialize WebRTC - only enable when we have a valid role and status is ready
  const webrtc = useWebRTC({
    roomId,
    isHost: state.role === 'host',
    enabled: state.status === 'ready' && state.role !== null,
  });

  // Get stored credentials
  const getCredentials = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(`room-${roomId}`);
    if (stored) {
      try {
        return JSON.parse(stored) as { displayName: string; password?: string };
      } catch {
        return null;
      }
    }
    return null;
  }, [roomId]);

  // Join or create room on connection
  useEffect(() => {
    if (!isConnected || !socket) return;

    const credentials = getCredentials();
    
    if (isHost) {
      // For host, create the room
      if (credentials) {
        emit('room:create', {
          desiredRoomId: roomId,
          desiredPassword: credentials.password,
          displayName: credentials.displayName,
        }, (response) => {
          if ('code' in response) {
            setState(prev => ({
              ...prev,
              status: 'error',
              errorMessage: response.message,
            }));
          } else {
            setState(prev => ({ ...prev, status: 'waiting', role: 'host' }));
          }
        });
      } else {
        router.push('/create');
      }
    } else {
      // For peer, join with password
      if (credentials?.password) {
        emit('room:join', {
          roomId,
          password: credentials.password,
          displayName: credentials.displayName,
        }, (response) => {
          if ('code' in response) {
            setState(prev => ({
              ...prev,
              status: 'error',
              errorMessage: response.message,
            }));
            toast({ title: 'Failed to join room', description: response.message, variant: 'destructive' });
          } else if ('roomState' in response) {
            const joinedResponse = response as RoomJoinedPayload;
            setState(prev => ({
              ...prev,
              status: joinedResponse.peer?.connected ? 'ready' : 'waiting',
              role: joinedResponse.role,
              roomState: joinedResponse.roomState,
              peerDisplayName: joinedResponse.peer?.displayName || null,
            }));
          } else {
            const waitingResponse = response as RoomWaitingPayload;
            setState(prev => ({
              ...prev,
              status: 'waiting',
              role: waitingResponse.role,
            }));
          }
        });
      } else {
        router.push(`/join?roomId=${roomId}`);
      }
    }
  }, [isConnected, socket, roomId, isHost, emit, getCredentials, router, toast]);

  // Start WebRTC call when ready
  useEffect(() => {
    if (state.status === 'ready') {
      webrtc.startCall();
    }
  }, [state.status]);

  // Handle room ready event
  const handleRoomReady = useCallback((payload: RoomReadyPayload) => {
    setState(prev => ({
      ...prev,
      status: 'ready',
      peerDisplayName: payload.peerDisplayName,
    }));
    toast({ title: `${payload.peerDisplayName} has joined!` });
  }, [toast]);

  // Handle room closed event
  const handleRoomClosed = useCallback((payload: RoomClosedPayload) => {
    webrtc.endCall();
    setState(prev => ({
      ...prev,
      status: 'closed',
    }));
    toast({ title: 'Room closed', description: 'The host has closed this room', variant: 'destructive' });
    setTimeout(() => router.push('/'), 2000);
  }, [toast, router, webrtc]);

  // Handle peer disconnected event
  const handlePeerDisconnected = useCallback((payload: RoomPeerDisconnectedPayload) => {
    setState(prev => ({
      ...prev,
      status: 'waiting',
    }));
    toast({ title: `${payload.peerDisplayName} disconnected` });
  }, [toast]);

  // Handle game start event (when host selects a game)
  const handleGameStart = useCallback((payload: GameStartPayload) => {
    if (payload.roomId === roomId) {
      setCurrentGame(payload.gameKey);
      toast({ title: `Game started: ${payload.gameKey.replace(/-/g, ' ')}` });
    }
  }, [roomId, toast]);

  // Register socket event listeners
  useSocketEvent('room:ready', handleRoomReady);
  useSocketEvent('room:closed', handleRoomClosed);
  useSocketEvent('room:peer_disconnected', handlePeerDisconnected);
  useSocketEvent('game:start', handleGameStart);

  // Handle leaving the room
  const handleLeave = useCallback(() => {
    webrtc.endCall();
    emit('room:leave', { roomId });
    sessionStorage.removeItem(`room-${roomId}`);
    router.push('/');
  }, [emit, roomId, router, webrtc]);

  // Handle closing the room (host only)
  const handleClose = useCallback(() => {
    webrtc.endCall();
    emit('room:close', { roomId });
    sessionStorage.removeItem(`room-${roomId}`);
    router.push('/');
  }, [emit, roomId, router, webrtc]);

  // Toggle controls
  const toggleChat = () => setControls(prev => ({ ...prev, isChatOpen: !prev.isChatOpen }));
  const toggleGameLauncher = () => setControls(prev => ({ ...prev, isGameLauncherOpen: !prev.isGameLauncherOpen }));

  // Render based on status
  if (state.status === 'connecting') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Connecting to room...</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-lg text-destructive">{state.errorMessage || 'Something went wrong'}</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (state.status === 'closed') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-lg">Room has been closed</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (state.status === 'waiting') {
    const credentials = getCredentials();
    
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Waiting for Partner</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="animate-pulse">
              <div className="h-24 w-24 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
                <Video className="h-12 w-12 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                {state.role === 'host' 
                  ? 'Share the room link and password with your friend'
                  : 'Waiting for the host to connect...'
                }
              </p>
              <p className="font-mono text-sm bg-muted p-2 rounded">
                Room: {roomId}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              {state.role === 'host' && credentials?.password && (
                <ShareDialog
                  roomId={roomId}
                  password={credentials.password}
                  trigger={
                    <Button variant="default">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Invite
                    </Button>
                  }
                />
              )}
              <Button variant="outline" onClick={handleLeave}>
                Leave Room
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Ready state - full room UI
  const credentials = getCredentials();
  
  return (
    <main className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold">PlayDate</h1>
          <span className="text-sm text-muted-foreground">
            Playing with {state.peerDisplayName || 'Partner'}
          </span>
          {webrtc.connectionState !== 'connected' && webrtc.connectionState !== 'new' && webrtc.connectionState !== 'initializing' && (
            <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              {webrtc.connectionState}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.role === 'host' && credentials?.password && (
            <ShareDialog roomId={roomId} password={credentials.password} />
          )}
          <Button variant="ghost" size="icon" onClick={toggleGameLauncher} title="Games">
            <Gamepad2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleChat} title="Chat">
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Game area */}
        <div className="flex-1 flex items-center justify-center p-4">
          {currentGame ? (
            <Card className="w-full max-w-2xl h-full flex flex-col">
              <GameContainer
                roomId={roomId}
                gameKey={currentGame}
                myRole={state.role!}
                onBack={() => {
                  setCurrentGame(null);
                  toggleGameLauncher();
                }}
              />
            </Card>
          ) : (
            <Card className="w-full max-w-2xl aspect-video flex items-center justify-center">
              <CardContent className="text-center p-8">
                <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground">
                  Select a game to start playing!
                </p>
                <Button className="mt-4" onClick={toggleGameLauncher}>
                  Choose Game
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Video dock */}
        <VideoDock
          localStream={webrtc.localStream}
          remoteStream={webrtc.remoteStream}
          isVideoEnabled={webrtc.isVideoEnabled}
          isAudioEnabled={webrtc.isAudioEnabled}
          isScreenSharing={webrtc.isScreenSharing}
          onToggleVideo={webrtc.toggleVideo}
          onToggleAudio={webrtc.toggleAudio}
          onStartScreenShare={webrtc.startScreenShare}
          onStopScreenShare={webrtc.stopScreenShare}
          connectionState={webrtc.connectionState}
          peerDisplayName={state.peerDisplayName || 'Partner'}
        />

        {/* Chat sidebar */}
        <Chat
          roomId={roomId}
          myRole={state.role!}
          isOpen={controls.isChatOpen}
          onClose={toggleChat}
        />
      </div>

      {/* Bottom controls */}
      <footer className="h-20 border-t flex items-center justify-center gap-4 shrink-0">
        <Button
          variant={webrtc.isVideoEnabled ? 'secondary' : 'destructive'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={webrtc.toggleVideo}
        >
          {webrtc.isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={webrtc.isAudioEnabled ? 'secondary' : 'destructive'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={webrtc.toggleAudio}
        >
          {webrtc.isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={webrtc.isScreenSharing ? 'destructive' : 'secondary'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={webrtc.isScreenSharing ? webrtc.stopScreenShare : webrtc.startScreenShare}
        >
          {webrtc.isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={state.role === 'host' ? handleClose : handleLeave}
        >
          <Phone className="h-5 w-5 rotate-[135deg]" />
        </Button>
      </footer>

      {/* Game launcher modal */}
      <GameLauncher
        roomId={roomId}
        isHost={state.role === 'host'}
        isOpen={controls.isGameLauncherOpen}
        onClose={toggleGameLauncher}
        currentGame={currentGame}
        onGameSelect={setCurrentGame}
      />
    </main>
  );
}
