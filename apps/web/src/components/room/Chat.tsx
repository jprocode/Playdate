'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, X, Smile } from 'lucide-react';

import type { ChatMessagePayload, ReactionPayload, PlayerRole } from '@playdate/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSocketEvent, useSocketEmit } from '@/hooks/useSocket';

interface ChatProps {
  roomId: string;
  myRole: PlayerRole;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  from: PlayerRole;
  displayName: string;
  message: string;
  timestamp: Date;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '😮', '😢', '🤔', '💯'];

export function Chat({ roomId, myRole, isOpen, onClose }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<{ id: string; emoji: string; displayName: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const emit = useSocketEmit();

  // Handle incoming chat messages
  const handleChatMessage = useCallback((payload: ChatMessagePayload) => {
    if (payload.roomId !== roomId) return;
    
    const newMessage: ChatMessage = {
      id: `${payload.timestamp}-${Math.random()}`,
      from: payload.from,
      displayName: payload.displayName,
      message: payload.message,
      timestamp: new Date(payload.timestamp),
    };
    
    setMessages(prev => [...prev, newMessage]);
  }, [roomId]);

  // Handle incoming reactions
  const handleReaction = useCallback((payload: ReactionPayload) => {
    if (payload.roomId !== roomId) return;
    
    const reactionId = `${payload.timestamp}-${Math.random()}`;
    setReactions(prev => [...prev, {
      id: reactionId,
      emoji: payload.emoji,
      displayName: payload.displayName,
    }]);

    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reactionId));
    }, 3000);
  }, [roomId]);

  useSocketEvent('chat:message', handleChatMessage);
  useSocketEvent('reaction', handleReaction);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    emit('chat:send', { roomId, message: trimmed });
    setInputValue('');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send reaction
  const handleSendReaction = (emoji: string) => {
    emit('reaction:send', { roomId, emoji });
    setShowEmojiPicker(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Reaction overlay */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {reactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute animate-float-up text-4xl"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              bottom: '10%',
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Chat panel */}
      <div className="w-80 border-l flex flex-col bg-background">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b shrink-0">
          <h2 className="font-semibold">Chat</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No messages yet. Say hello! 👋
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col',
                  msg.from === myRole ? 'items-end' : 'items-start'
                )}
              >
                <span className="text-xs text-muted-foreground mb-1">
                  {msg.from === myRole ? 'You' : msg.displayName}
                </span>
                <div
                  className={cn(
                    'max-w-[80%] px-3 py-2 rounded-lg',
                    msg.from === myRole
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t shrink-0">
          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="mb-2 p-2 border rounded-lg bg-background">
              <div className="flex flex-wrap gap-1">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="p-2 hover:bg-muted rounded text-xl transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              maxLength={500}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Chat;

