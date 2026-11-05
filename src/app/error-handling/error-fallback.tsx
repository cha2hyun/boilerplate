import { useEffect, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { VStack } from '@/shared/ui/stack'
import { getErrorCopy } from './error-copy'

export function ErrorFallback({ variant = 'app' }: { variant?: 'app' | 'startup' }) {
  const { locale, copy } = getErrorCopy(variant)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    title.current?.focus()
  }, [])

  return (
    <VStack asChild justify="center" className="min-h-svh bg-background p-6 text-foreground">
      <main lang={locale} aria-labelledby="recovery-title" aria-describedby="recovery-description">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              <h1 ref={title} id="recovery-title" tabIndex={-1} className="text-2xl">
                {copy.title}
              </h1>
            </CardTitle>
            <CardDescription id="recovery-description">{copy.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.location.reload()
              }}
            >
              {copy.reload}
            </Button>
          </CardContent>
        </Card>
      </main>
    </VStack>
  )
}
