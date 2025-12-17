// WebRTC Hook
// Handles WebRTC peer connection, media streams, and signaling

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

import type { RTCOfferPayload, RTCAnswerPayload, RTCIcePayload } from '@playdate/shared';

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
  connectionState: RTCPeerConnectionState | 'new';
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
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'new'>('new');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);

  // Get user media
  const getUserMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
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
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get user media:', error);
      // Try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        localStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setIsVideoEnabled(false);
        return audioStream;
      } catch (audioError) {
        console.error('Failed to get audio:', audioError);
        return null;
      }
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(async (): Promise<RTCPeerConnection | null> => {
    try {
      const creds = await fetchTurnCredentials();
      const iceServers = buildIceServers(creds);

      const config: RTCConfiguration = {
        iceServers,
        iceCandidatePoolSize: 10,
      };

      const pc = new RTCPeerConnection(config);
      peerConnectionRef.current = pc;

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        console.log('Connection state:', pc.connectionState);
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const socket = getSocket();
          socket.emit('rtc:ice', {
            roomId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        const [stream] = event.streams;
        if (stream) {
          setRemoteStream(stream);
        }
      };

      // Handle negotiation needed
      pc.onnegotiationneeded = async () => {
        if (!isHost) return; // Only host initiates offers

        try {
          makingOfferRef.current = true;
          await pc.setLocalDescription();
          const socket = getSocket();
          socket.emit('rtc:offer', {
            roomId,
            sdp: pc.localDescription!,
          });
        } catch (error) {
          console.error('Negotiation failed:', error);
        } finally {
          makingOfferRef.current = false;
        }
      };

      return pc;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      return null;
    }
  }, [roomId, isHost]);

  // Handle incoming RTC offer
  const handleOffer = useCallback(async (payload: RTCOfferPayload) => {
    if (payload.roomId !== roomId) return;

    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
      ignoreOfferRef.current = isHost && offerCollision;

      if (ignoreOfferRef.current) {
        console.log('Ignoring offer due to collision');
        return;
      }

      await pc.setRemoteDescription(payload.sdp);

      // Add any pending candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];

      // Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const socket = getSocket();
      socket.emit('rtc:answer', {
        roomId,
        sdp: pc.localDescription!,
      });
    } catch (error) {
      console.error('Failed to handle offer:', error);
    }
  }, [roomId, isHost]);

  // Handle incoming RTC answer
  const handleAnswer = useCallback(async (payload: RTCAnswerPayload) => {
    if (payload.roomId !== roomId) return;

    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(payload.sdp);

      // Add any pending candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current = [];
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  }, [roomId]);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (payload: RTCIcePayload) => {
    if (payload.roomId !== roomId) return;

    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      const candidate = new RTCIceCandidate(payload.candidate);
      if (pc.remoteDescription) {
        await pc.addIceCandidate(candidate);
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }, [roomId]);

  // Setup socket listeners
  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    socket.on('rtc:offer', handleOffer);
    socket.on('rtc:answer', handleAnswer);
    socket.on('rtc:ice', handleIceCandidate);

    return () => {
      socket.off('rtc:offer', handleOffer);
      socket.off('rtc:answer', handleAnswer);
      socket.off('rtc:ice', handleIceCandidate);
    };
  }, [enabled, handleOffer, handleAnswer, handleIceCandidate]);

  // Start call
  const startCall = useCallback(async () => {
    // Get local media
    const stream = await getUserMedia();
    if (!stream) {
      console.error('No local stream available');
      return;
    }

    // Create peer connection
    const pc = await createPeerConnection();
    if (!pc) {
      console.error('Failed to create peer connection');
      return;
    }

    // Add local tracks to connection
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }

    // If host, create and send offer
    if (isHost) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const socket = getSocket();
        socket.emit('rtc:offer', {
          roomId,
          sdp: pc.localDescription!,
        });
      } catch (error) {
        console.error('Failed to create offer:', error);
      }
    }
  }, [getUserMedia, createPeerConnection, isHost, roomId]);

  // End call
  const endCall = useCallback(() => {
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

    setRemoteStream(null);
    setConnectionState('new');
    setIsScreenSharing(false);
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
      console.error('Failed to start screen share:', error);
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

