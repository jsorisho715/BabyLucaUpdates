import Image from 'next/image'
import { JoinForm } from '@/components/chat/JoinForm'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getSession()
  if (session) {
    redirect('/chat')
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

      {/* Watercolor ultrasound hero */}
      <div className="watercolor-overlay relative mx-auto mt-8 mb-2 h-56 w-56 overflow-hidden rounded-full sm:mt-12 sm:h-72 sm:w-72">
        <Image
          src="/images/luca-ultrasound.png"
          alt="Baby Luca's ultrasound"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 640px) 224px, 288px"
        />
        <div className="absolute inset-0 rounded-full ring-4 ring-primary/20" />
      </div>

      {/* Title section */}
      <div className="relative z-10 px-4 text-center">
        <h1 className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          {"Luca's Updates"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground sm:text-lg">
          Follow along as Baby Luca makes his grand entrance into the world.
          Real-time updates from Jordyn & Johnathan.
        </p>
      </div>

      {/* Join form */}
      <div className="relative z-10 w-full max-w-md px-4 pt-6 pb-12">
        <JoinForm />
      </div>

      {/* Decorative footer dots */}
      <div className="absolute bottom-6 flex gap-1.5">
        {[0.3, 0.5, 0.7, 0.5, 0.3].map((opacity, i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            style={{ opacity }}
          />
        ))}
      </div>
    </main>
  )
}
