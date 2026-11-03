import { useState } from 'react'
import { ArrowUpRight, Bell, Check, LoaderCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Progress } from '@/shared/ui/progress'
import { Skeleton } from '@/shared/ui/skeleton'
import { Switch } from '@/shared/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const tokens = [
  {
    name: 'Background',
    className: 'bg-background text-foreground',
    description: 'Default page canvas',
  },
  {
    name: 'Primary',
    className: 'bg-primary text-primary-foreground',
    description: 'Main actions · neutral',
  },
  {
    name: 'Secondary',
    className: 'bg-secondary text-secondary-foreground',
    description: 'Supporting actions',
  },
  {
    name: 'Muted',
    className: 'bg-muted text-muted-foreground',
    description: 'Supporting information',
  },
  {
    name: 'Accent',
    className: 'bg-accent text-accent-foreground',
    description: 'Hover and selected states',
  },
  {
    name: 'Brand · Blueprint Blue',
    className: 'bg-brand text-brand-foreground',
    description: 'Reserved for brand emphasis',
  },
]
export function ComponentsPage() {
  const [notifications, setNotifications] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [progress, setProgress] = useState(64)
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">The building blocks</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One design language. Endless possibilities.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="https://ui.shadcn.com/docs/components" target="_blank" rel="noreferrer">
            Explore shadcn/ui
            <ArrowUpRight />
          </a>
        </Button>
      </div>
      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="tokens">Theme tokens</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="mt-6 grid items-start gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>The right emphasis for every interaction.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button onClick={() => toast.success('Ready for your next idea.')}>
                <Plus />
                Primary action
              </Button>
              <Button variant="secondary" onClick={() => toast('A secondary action')}>
                Secondary
              </Button>
              <Button variant="outline" onClick={() => toast.info('An outline action')}>
                Outline
              </Button>
              <Button variant="ghost" onClick={() => toast('A subtle action')}>
                Ghost
              </Button>
              <Button disabled>
                <LoaderCircle className="animate-spin" />
                Processing
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Status & identity</CardTitle>
              <CardDescription>Little details that make things clear.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge>Active</Badge>
                <Badge variant="secondary">In progress</Badge>
                <Badge variant="outline">Draft</Badge>
                <Badge variant="destructive">Needs attention</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['JD', 'AK', 'ML', '+3'].map((name) => (
                    <Avatar key={name} className="border-2 border-background">
                      <AvatarFallback className="text-xs">{name}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">Better together.</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Inputs & preferences</CardTitle>
              <CardDescription>Accessible controls, ready to use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="example-name">Project name</Label>
                <Input id="example-name" placeholder="Your next big idea" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="example-terms" />
                <Label htmlFor="example-terms">Include in the weekly summary</Label>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="example-notifications">Notifications preview</Label>
                <Switch
                  id="example-notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Notifications are {notifications ? 'enabled' : 'disabled'} in this preview.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Feedback & overlays</CardTitle>
              <CardDescription>Keep everyone in the loop.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Alert>
                <Check />
                <AlertTitle>Everything is up to date</AlertTitle>
                <AlertDescription>Your workspace is ready for the next step.</AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.success('All changes saved', {
                      description: 'You can keep working with confidence.',
                    })
                  }
                >
                  <Bell />
                  Show notification
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Room for your next idea</DialogTitle>
                      <DialogDescription>
                        This dialog handles focus, keyboard navigation, and screen readers for you.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setDialogOpen(false)
                        }}
                      >
                        Got it
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>A clear sense of what's ahead.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Workspace setup</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} aria-label="Workspace setup" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setProgress((value) => (value >= 100 ? 0 : Math.min(100, value + 12)))
                }}
              >
                {progress >= 100 ? 'Reset progress' : 'Advance progress'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Loading states</CardTitle>
              <CardDescription>A calm experience while content arrives.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tokens" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Semantic colors</CardTitle>
              <CardDescription>
                Neutral surfaces, one reserved brand color, and semantic foreground pairs.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {tokens.map((token) => (
                <div key={token.name} className="space-y-2">
                  <div
                    className={`${token.className} flex h-24 items-center justify-center rounded-lg border text-2xl font-semibold`}
                  >
                    Aa
                  </div>
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="text-xs text-muted-foreground">{token.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Alert className="mt-5">
            <Check />
            <AlertTitle>Color communicates a role</AlertTitle>
            <AlertDescription>
              Primary stays neutral. Use brand only for intentional brand emphasis, destructive for
              errors and destructive actions, and text or icons to explain status.
            </AlertDescription>
          </Alert>
        </TabsContent>
        <TabsContent value="typography" className="mt-6 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Pretendard · three weights</CardTitle>
              <CardDescription>
                One typeface for clear, consistent Korean and Latin text.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-3">
              {[
                {
                  weight: '400',
                  name: 'Regular',
                  className: 'font-normal',
                  role: 'Body text, descriptions, table data.',
                },
                {
                  weight: '500',
                  name: 'Medium',
                  className: 'font-medium',
                  role: 'Buttons, labels, tabs, navigation.',
                },
                {
                  weight: '600',
                  name: 'SemiBold',
                  className: 'font-semibold',
                  role: 'Headings, key metrics, strong emphasis.',
                },
              ].map((type) => (
                <div key={type.weight} className="space-y-3">
                  <Badge variant="outline">
                    {type.weight} · {type.name}
                  </Badge>
                  <p
                    data-testid={`type-sample-${type.weight}`}
                    className={`${type.className} text-2xl`}
                  >
                    명확한 시작, 더 나은 제품.
                    <br />
                    Build with clarity.
                  </p>
                  <p className="text-sm text-muted-foreground">{type.role}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Alert>
            <Check />
            <AlertTitle>Keep the hierarchy simple</AlertTitle>
            <AlertDescription>
              Use size, spacing, and semantic contrast before adding emphasis. Regular, Medium, and
              SemiBold are the only weights in this workspace.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  )
}
