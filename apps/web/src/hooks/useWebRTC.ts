// WebRTC Hook
// Handles WebRTC peer connection, media streams, and signaling

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

import type { RTCOfferPayload, RTCAnswerPayload, RTCIcePayload, RTCNegotiatePayload } from '@playdate/shared';

import { getSocket } from '@/lib/socket-client';

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

interface UseWebRTCOptions {
  roomId: string;
  isHost: boolean;
  enabled?: boolean;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState | 'new' | 'initializing';
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  startCall: () => Promise<void>;
  endCall: () => void;
}

// Fetch TURN credentials from server
async function fetchTurnCredentials(): Promise<TurnCredentials> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/turn-credentials`);
    if (!response.ok) {
      throw new Error('Failed to fetch TURN credentials');
    }
    return response.json();
  } catch (error) {
    console.warn('Failed to fetch TURN credentials, using STUN only:', error);
    return {
      urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'],
      username: '',
      credential: '',
      ttl: 86400,
    };
  }
}

// Build ICE server configuration
function buildIceServers(creds: TurnCredentials): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  // Add STUN servers
  const stunUrls = creds.urls.filter(url => url.startsWith('stun:'));
  if (stunUrls.length > 0) {
    servers.push({ urls: stunUrls });
  }

  // Add TURN servers with credentials
  const turnUrls = creds.urls.filter(url => url.startsWith('turn:'));
  if (turnUrls.length > 0 && creds.username && creds.credential) {
    servers.push({
      urls: turnUrls,
      username: creds.username,
      credential: creds.credential,
    });
  }

  // If no servers configured, use default STUN
  if (servers.length === 0) {
    servers.push({
      urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'],
    });
  }

  return servers;
}

export function useWebRTC({
  roomId,
  isHost,
  enabled = true,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'new' | 'initializing'>('new');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const isReadyRef = useRef(false);
  const hasStartedRef = useRef(false);

  // Get user media
  const getUserMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      console.log('[WebRTC] Requesting user media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('[WebRTC] Got user media stream');
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('[WebRTC] Failed to get user media:', error);
      // Try audio only
      try {
        console.log('[WebRTC] Trying audio only...');
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        console.log('[WebRTC] Got audio-only stream');
        localStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setIsVideoEnabled(false);
        return audioStream;
      } catch (audioError) {
        console.error('[WebRTC] Failed to get audio:', audioError);
        return null;
      }
    }
  }, []);

  // Create peer connection (without automatic negotiation)
  const createPeerConnection = useCallback(async (): Promise<RTCPeerConnection | null> => {
    try {
      console.log('[WebRTC] Fetching TURN credentials...');
      const creds = await fetchTurnCredentials();
      const iceServers = buildIceServers(creds);
      console.log('[WebRTC] ICE servers configured:', iceServers.map(s => s.urls));

      const config: RTCConfiguration = {
        iceServers,
        iceCandidatePoolSize: 10,
      };

      console.log('[WebRTC] Creating RTCPeerConnection...');
      const pc = new RTCPeerConnection(config);
      peerConnectionRef.current = pc;

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        setConnectionState(pc.connectionState);
        
        // Handle failed connection - could implement retry logic here
        if (pc.connectionState === 'failed') {
          console.error('[WebRTC] Connection failed');
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
        
        // Handle ICE failure
        if (pc.iceConnectionState === 'failed') {
          console.log('[WebRTC] ICE failed, attempting restart...');
          pc.restartIce();
        }
      };

      // Handle ICE gathering state
      pc.onicegatheringstatechange = () => {
        console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState);
      };

      // Handle signaling state changes
      pc.onsignalingstatechange = () => {
        console.log('[WebRTC] Signaling state:', pc.signalingState);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTC] Sending ICE candidate');
          const socket = getSocket();
          socket.emit('rtc:ice', {
            roomId,
            candidate: event.candidate.toJSON(),
          });
        } else {
          console.log('[WebRTC] ICE gathering complete');
        }
      };

      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind, 'readyState:', event.track.readyState);
        
        if (event.streams && event.streams.length > 0) {
          const stream = event.streams[0];
          
          // Log stream info
          console.log('[WebRTC] Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.readyState}`));
          
          // Validate stream has active tracks
          const hasActiveTracks = stream.getTracks().some(t => t.readyState === 'live');
          
          if (hasActiveTracks) {
            console.log('[WebRTC] Setting remote stream with active tracks');
            setRemoteStream(stream);
            
            // Handle track ended events to update UI
            stream.getTracks().forEach(track => {
              track.onended = () => {
                console.log(`[WebRTC] Remote ${track.kind} track ended`);
                // Only clear stream if no tracks are live
                const activeTracks = stream.getTracks().filter(t => t.readyState === 'live');
                if (activeTracks.length === 0) {
                  console.log('[WebRTC] All remote tracks ended, clearing stream');
                  setRemoteStream(null);
                }
              };
              
              track.onmute = () => {
                console.log(`[WebRTC] Remote ${track.kind} track muted`);
              };
              
              track.onunmute = () => {
                console.log(`[WebRTC] Remote ${track.kind} track unmuted`);
              };
            });
          } else {
            console.warn('[WebRTC] Stream received but no active tracks');
          }
        } else {
          // No streams in event, create one from the track
          console.log('[WebRTC] No streams in track event, creating new MediaStream');
          const track = event.track;
          if (track.readyState === 'live') {
            const newStream = new MediaStream([track]);
            setRemoteStream(prevStream => {
              if (prevStream) {
                // Add track to existing stream
                prevStream.addTrack(track);
                return prevStream;
              }
              return newStream;
            });
          }
        }
      };

      // NOTE: We do NOT set onnegotiationneeded here
      // Negotiation is explicitly triggered via rtc:negotiate event

      console.log('[WebRTC] Peer connection created successfully');
      return pc;
    } catch (error) {
      console.error('[WebRTC] Failed to create peer connection:', error);
      return null;
    }
  }, [roomId]);

  // Create and send offer (called by host after rtc:negotiate)
  const createOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('[WebRTC] No peer connection for creating offer');
      return;
    }

    try {
      console.log('[WebRTC] Creating offer...');
      const offer = await pc.createOffer();
      console.log('[WebRTC] Setting local description...');
      await pc.setLocalDescription(offer);

      const socket = getSocket();
      console.log('[WebRTC] Sending offer to peer');
      socket.emit('rtc:offer', {
        roomId,
        sdp: pc.localDescription!,
      });
    } catch (error) {
      console.error('[WebRTC] Failed to create offer:', error);
    }
  }, [roomId]);

  // Handle rtc:negotiate event
  const handleNegotiate = useCallback(async (payload: RTCNegotiatePayload) => {
    if (payload.roomId !== roomId) return;

    console.log('[WebRTC] Received negotiate signal, initiator:', payload.initiator);
    
    // Only the host creates the offer
    if (isHost && payload.initiator === 'host') {
      console.log('[WebRTC] I am host, creating offer...');
      await createOffer();
    } else {
      console.log('[WebRTC] I am peer, waiting for offer...');
    }
  }, [roomId, isHost, createOffer]);

  // Handle incoming RTC offer
  const handleOffer = useCallback(async (payload: RTCOfferPayload) => {
    if (payload.roomId !== roomId) return;

    console.log('[WebRTC] Received offer');
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('[WebRTC] No peer connection to handle offer');
      return;
    }

    try {
      // Check signaling state
      if (pc.signalingState !== 'stable') {
        console.log('[WebRTC] Signaling state not stable, current:', pc.signalingState);
        // For the host, ignore offers in non-stable state (we're the offerer)
        if (isHost) {
          console.log('[WebRTC] Ignoring offer as host in non-stable state');
          return;
        }
      }

      console.log('[WebRTC] Setting remote description (offer)...');
      await pc.setRemoteDescription(payload.sdp);

      // Add any pending ICE candidates
      console.log('[WebRTC] Adding', pendingCandidatesRef.current.length, 'pending ICE candidates');
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          console.warn('[WebRTC] Failed to add pending candidate:', e);
        }
      }
      pendingCandidatesRef.current = [];

      // Create and send answer
      console.log('[WebRTC] Creating answer...');
      const answer = await pc.createAnswer();
      console.log('[WebRTC] Setting local description (answer)...');
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      console.log('[WebRTC] Sending answer to peer');
      socket.emit('rtc:answer', {
        roomId,
        sdp: pc.localDescription!,
      });
    } catch (error) {
      console.error('[WebRTC] Failed to handle offer:', error);
    }
  }, [roomId, isHost]);

  // Handle incoming RTC answer
  const handleAnswer = useCallback(async (payload: RTCAnswerPayload) => {
    if (payload.roomId !== roomId) return;

    console.log('[WebRTC] Received answer');
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('[WebRTC] No peer connection to handle answer');
      return;
    }

    try {
      console.log('[WebRTC] Setting remote description (answer)...');
      await pc.setRemoteDescription(payload.sdp);

      // Add any pending ICE candidates
      console.log('[WebRTC] Adding', pendingCandidatesRef.current.length, 'pending ICE candidates');
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (e) {
          console.warn('[WebRTC] Failed to add pending candidate:', e);
        }
      }
      pendingCandidatesRef.current = [];
    } catch (error) {
      console.error('[WebRTC] Failed to handle answer:', error);
    }
  }, [roomId]);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (payload: RTCIcePayload) => {
    if (payload.roomId !== roomId) return;

    const pc = peerConnectionRef.current;
    if (!pc) {
      console.log('[WebRTC] No peer connection, buffering ICE candidate');
      pendingCandidatesRef.current.push(new RTCIceCandidate(payload.candidate));
      return;
    }

    try {
      const candidate = new RTCIceCandidate(payload.candidate);
      
      // If remote description is set, add immediately; otherwise buffer
      if (pc.remoteDescription && pc.remoteDescription.type) {
        console.log('[WebRTC] Adding ICE candidate immediately');
        await pc.addIceCandidate(candidate);
      } else {
        console.log('[WebRTC] Buffering ICE candidate (no remote description yet)');
        pendingCandidatesRef.current.push(candidate);
      }
    } catch (error) {
      console.error('[WebRTC] Failed to add ICE candidate:', error);
    }
  }, [roomId]);

  // Setup socket listeners
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    socket.on('rtc:negotiate', handleNegotiate);
    socket.on('rtc:offer', handleOffer);
    socket.on('rtc:answer', handleAnswer);
    socket.on('rtc:ice', handleIceCandidate);

    return () => {
      socket.off('rtc:negotiate', handleNegotiate);
      socket.off('rtc:offer', handleOffer);
      socket.off('rtc:answer', handleAnswer);
      socket.off('rtc:ice', handleIceCandidate);
    };
  }, [enabled, handleNegotiate, handleOffer, handleAnswer, handleIceCandidate]);

  // Start call - get media, create connection, signal ready
  const startCall = useCallback(async () => {
    // Prevent multiple calls
    if (hasStartedRef.current) {
      console.log('[WebRTC] Call already started, skipping');
      return;
    }
    hasStartedRef.current = true;

    console.log('[WebRTC] Starting call...');
    setConnectionState('initializing');

    // Get local media first
    const stream = await getUserMedia();
    if (!stream) {
      console.error('[WebRTC] No local stream available');
      hasStartedRef.current = false;
      return;
    }

    // Create peer connection
    const pc = await createPeerConnection();
    if (!pc) {
      console.error('[WebRTC] Failed to create peer connection');
      hasStartedRef.current = false;
      return;
    }

    // Add local tracks to connection
    console.log('[WebRTC] Adding local tracks to peer connection');
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    // Signal ready to server
    console.log('[WebRTC] Signaling ready to server');
    const socket = getSocket();
    socket.emit('rtc:ready', { roomId });
    isReadyRef.current = true;

    // The server will emit rtc:negotiate when both peers are ready
    // Then the host will create the offer
  }, [roomId, getUserMedia, createPeerConnection]);

  // End call
  const endCall = useCallback(() => {
    console.log('[WebRTC] Ending call');
    
    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Stop screen share
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset state
    setRemoteStream(null);
    setConnectionState('new');
    setIsScreenSharing(false);
    isReadyRef.current = false;
    hasStartedRef.current = false;
    pendingCandidatesRef.current = [];
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      const pc = peerConnectionRef.current;
      if (pc) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }

        // Handle screen share ending
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (error) {
      console.error('[WebRTC] Failed to start screen share:', error);
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera track
    const stream = localStreamRef.current;
    const pc = peerConnectionRef.current;
    if (stream && pc) {
      const videoTrack = stream.getVideoTracks()[0];
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }

    setIsScreenSharing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    startCall,
    endCall,
  };
}

export default useWebRTC;
