import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export function OverviewAnalyticsSkeleton() {
  return (
    <div className="space-y-7" role="status" aria-label="Loading analytics">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="gap-4 shadow-xs">
            <CardHeader className="gap-2">
              <Skeleton className="h-4 w-24" />
              <CardAction>
                <Skeleton className="size-4" />
              </CardAction>
              <Skeleton className="h-9 w-28" />
            </CardHeader>
            <CardFooter className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5.5 w-16 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </CardFooter>
          </Card>
        ))}
      </div>
      <div
        className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
        aria-hidden="true"
      >
        <Card className="h-full shadow-xs">
          <CardHeader className="gap-1">
            <CardTitle>Revenue overview</CardTitle>
            <CardDescription>How your business is performing over time.</CardDescription>
            <CardAction>
              <Skeleton className="h-9 w-36" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-60 w-full" />
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardFooter>
        </Card>
        <Card className="gap-5 shadow-xs">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>The latest from your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="mt-auto border-t pt-4">
            <Skeleton className="h-8 w-full" />
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
