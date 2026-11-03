import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { preferencesSchema, usePreferences } from '@/features/workspace-preferences'
import { useTheme } from '@/shared/lib/theme'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const preferences = usePreferences()
  const [workspaceName, setWorkspaceName] = useState(preferences.workspaceName)
  const [compactMode, setCompactMode] = useState(preferences.compactMode)
  const [error, setError] = useState<string>()
  const dirty =
    workspaceName !== preferences.workspaceName || compactMode !== preferences.compactMode
  return (
    <div className="max-w-4xl space-y-7">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">A workspace that feels like yours.</p>
      </div>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="mt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const result = preferencesSchema.safeParse({ workspaceName, compactMode })
              if (!result.success) {
                setError(result.error.issues[0]?.message)
                return
              }
              preferences.save(result.data)
              setWorkspaceName(result.data.workspaceName)
              setError(undefined)
              toast.success('Preferences updated')
            }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Workspace preferences</CardTitle>
                <CardDescription>Saved in this browser when storage is available.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-w-md space-y-2">
                  <Label htmlFor="workspace-name">Workspace name</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(event) => {
                      setWorkspaceName(event.target.value)
                    }}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'workspace-error' : 'workspace-hint'}
                    maxLength={40}
                  />
                  <p id="workspace-hint" className="text-xs text-muted-foreground">
                    This name appears in your sidebar.
                  </p>
                  {error && (
                    <p id="workspace-error" role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-5">
                  <div className="space-y-1">
                    <Label htmlFor="compact-mode">Compact layout</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce page spacing to fit more into your workspace.
                    </p>
                  </div>
                  <Switch
                    id="compact-mode"
                    checked={compactMode}
                    onCheckedChange={setCompactMode}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-4 border-t pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    preferences.reset()
                    setWorkspaceName('Acme Studio')
                    setCompactMode(false)
                    setError(undefined)
                    toast.success('Preferences reset')
                  }}
                >
                  Reset preferences
                </Button>
                <Button type="submit" disabled={!dirty}>
                  Save changes
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how Blueprint looks on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    value: 'light' as const,
                    label: 'Light',
                    icon: Sun,
                    description: 'A clean, bright workspace.',
                  },
                  {
                    value: 'dark' as const,
                    label: 'Dark',
                    icon: Moon,
                    description: 'A little easier on the eyes.',
                  },
                  {
                    value: 'system' as const,
                    label: 'System',
                    icon: Monitor,
                    description: 'Follow your device settings.',
                  },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'secondary' : 'outline'}
                    className="h-auto flex-col items-start gap-3 p-5"
                    onClick={() => {
                      setTheme(option.value)
                    }}
                    aria-pressed={theme === option.value}
                  >
                    <option.icon className="size-6" />
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {option.description}
                    </span>
                  </Button>
                ))}
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                Your theme preference is applied immediately.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
