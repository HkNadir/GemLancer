// Auth layout — centered, no sidebar
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gem-50 via-background to-gem-50 px-4">
      {children}
    </div>
  )
}
