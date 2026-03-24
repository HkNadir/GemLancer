import { notFound } from 'next/navigation'
import { Download, FileText } from 'lucide-react'
import { validatePortalToken, getPortalFiles } from '@/lib/portal/queries'

export default async function PortalFilesPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const session = await validatePortalToken(token)
  if (!session) notFound()

  const files = await getPortalFiles(session.tenantId, session.clientId)

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
      <p className="text-sm text-muted-foreground -mt-4">Files shared with you by your service provider.</p>

      {files.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No files shared yet</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {files.map((f: any) => (
                <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {f.projects?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {fmtDate(f.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                    {fmtSize(f.size_bytes)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {f.signed_url && (
                      <a
                        href={f.signed_url}
                        download={f.name}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
