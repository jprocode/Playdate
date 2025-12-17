import Link from 'next/link';
import { Gamepad2, Video, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                PlayDate
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Video call your friend and play games together on the same screen
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/create">Create Room</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="/join">Join Room</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
            Everything you need for game night
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-card/50 backdrop-blur">
              <CardHeader>
                <Video className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>HD Video Calls</CardTitle>
                <CardDescription>
                  Crystal clear 1-on-1 video calling with screen share support
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
              <CardHeader>
                <Gamepad2 className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>10+ Games</CardTitle>
                <CardDescription>
                  From classics like Chess to word games like Wordle
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 backdrop-blur">
              <CardHeader>
                <Users className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>Real-time Sync</CardTitle>
                <CardDescription>
                  Both players see the same game state, perfectly synchronized
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Games Preview */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-semibold mb-8">
            Games for every mood
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Tic Tac Toe',
              'Connect 4',
              'Chess',
              'Trivia',
              'Speed Wordle',
              'Connections',
              'Hangman',
              '20 Questions',
              'Pictionary',
              'Co-op Crossword',
            ].map((game) => (
              <span
                key={game}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                {game}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>PlayDate - Video call and play games with your friend</p>
        </div>
      </footer>
    </main>
  );
}
