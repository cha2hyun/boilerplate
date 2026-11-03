import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'

export function StartupError() {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <div className="max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Unable to start the demo</AlertTitle>
          <AlertDescription>
            The sample data service could not start. Reload this page to try again.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            window.location.reload()
          }}
        >
          Reload page
        </Button>
      </div>
    </main>
  )
}
