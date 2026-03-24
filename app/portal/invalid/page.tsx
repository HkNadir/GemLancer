export const metadata = {
  title: 'Link Expired — GemLancer',
  robots: { index: false, follow: false },
}

export default function InvalidPortalPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center max-w-sm">
        <div className="text-4xl mb-4">🔗</div>
        <h1 className="text-xl font-semibold tracking-tight">Link expired or invalid</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This portal link has expired or is no longer valid. Please contact your service provider
          to request a new one.
        </p>
      </div>
    </main>
  )
}
