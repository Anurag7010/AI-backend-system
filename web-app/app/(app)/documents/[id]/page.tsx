import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { documentsRepository, queriesRepository } from '@/db'
import type { Metadata } from 'next'
import { DocumentDetailView } from './DocumentDetailView'

type PageProps = { params: { id: string } }

// generateMetadata runs on the server — can fetch data directly.
// Fetches document to use filename as the page title.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const doc = await documentsRepository.findById(params.id)
  return { title: doc?.filename ?? 'Document Not Found' }
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  // Fetch document and its queries in parallel — independent data sources
  const [document, queries] = await Promise.all([
    documentsRepository.findById(params.id),
    queriesRepository.findByDocument(params.id),
  ])

  // notFound() renders not-found.tsx and returns 404 — correct HTTP behavior
  if (!document) notFound()

  // Ownership check — users should only see their own documents
  // In a real app: compare document.userId to session.userId
  // For now with stubbed auth, we pass through

  // Server Component passes data to Client Component as props.
  // All the interactivity (delete modal, navigation) lives in DocumentDetailView.
  // Server is responsible for: auth, data fetching, 404 handling.
  // Client is responsible for: delete flow, modal state, navigation after delete.
  return (
    <DocumentDetailView
      document={document}
      initialQueries={queries}
    />
  )
}