import { createFileRoute } from '@tanstack/react-router'
import { FoundationsPage } from '@/pages/foundations'

export const Route = createFileRoute('/foundations')({ component: FoundationsPage })
