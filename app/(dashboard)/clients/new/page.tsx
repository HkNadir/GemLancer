import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ClientForm } from '@/components/app/clients/client-form'

export const metadata = { title: 'New Client — GemLancer' }

export default function NewClientPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clients" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Clients
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Client</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new client to start tracking projects and invoices.
        </p>
      </div>

      <ClientForm />
    </div>
  )
}
