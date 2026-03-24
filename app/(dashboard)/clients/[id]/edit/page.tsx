import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getClientById } from '@/lib/clients/queries'
import { ClientForm } from '@/components/app/clients/client-form'

export const metadata = { title: 'Edit Client — GemLancer' }

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const tenantId = user?.app_metadata?.tenant_id as string

  const { id } = await params
  const client = await getClientById(tenantId, id)
  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {client.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Client</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update {client.name}&apos;s information.
        </p>
      </div>

      <ClientForm client={client} />
    </div>
  )
}
