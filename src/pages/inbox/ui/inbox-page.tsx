import { useRef, useState } from 'react'
import { Archive, ArchiveRestore, ArrowLeft, Inbox, Mail, MailOpen, Search } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { formatDate, formatNumber } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty'
import { Input } from '@/shared/ui/input'
import { Separator } from '@/shared/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { sampleMessages, type SampleMessage } from '../model/sample-messages'

type InboxView = 'all' | 'unread' | 'archived'

export function InboxPage() {
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState(sampleMessages)
  const [view, setView] = useState<InboxView>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)
  const messageRefs = useRef(new Map<string, HTMLButtonElement>())
  const selected = messages.find((message) => message.id === selectedId)
  const unreadCount = messages.filter((message) => message.unread && !message.archived).length
  const query = search.trim().toLowerCase()
  const visibleMessages = messages.filter((message) => {
    const inView =
      view === 'archived'
        ? message.archived
        : !message.archived && (view === 'all' || message.unread)
    return (
      inView &&
      `${message.sender} ${message.subject} ${message.preview} ${message.body.join(' ')}`
        .toLowerCase()
        .includes(query)
    )
  })

  function openMessage(message: SampleMessage) {
    setSelectedId(message.id)
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, unread: false } : item)),
    )
    requestAnimationFrame(() => detailHeadingRef.current?.focus())
  }

  function closeMessage() {
    const lastSelectedId = selectedId
    setSelectedId(null)
    requestAnimationFrame(() => {
      const messageButton = lastSelectedId ? messageRefs.current.get(lastSelectedId) : undefined
      if (messageButton) messageButton.focus()
      else searchRef.current?.focus()
    })
  }

  function toggleRead(message: SampleMessage) {
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? { ...item, unread: !item.unread } : item)),
    )
    setAnnouncement(`“${message.subject}” marked as ${message.unread ? 'read' : 'unread'}.`)
  }

  function toggleArchive(message: SampleMessage) {
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? { ...item, archived: !item.archived } : item,
      ),
    )
    setSelectedId(null)
    setAnnouncement(`“${message.subject}” ${message.archived ? 'moved to inbox' : 'archived'}.`)
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
          <Badge variant="secondary">Sample</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A little space to keep your conversations in order.
        </p>
      </div>

      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 md:px-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Inbox className="size-4" />
            All messages<Badge variant="outline">{formatNumber(unreadCount)} unread</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Sample messages · Changes reset when you leave this page.
          </p>
        </div>
        <div className="grid min-h-[620px] md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <section
            aria-label="Message list"
            className={cn('min-w-0 md:border-r', selected && 'hidden md:block')}
          >
            <Tabs
              value={view}
              className="gap-0"
              onValueChange={(value) => {
                if (value === 'all' || value === 'unread' || value === 'archived') {
                  setView(value)
                  setSelectedId(null)
                }
              }}
            >
              <div className="space-y-4 border-b p-4">
                <TabsList className="w-full" aria-label="Message views">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    aria-label="Search messages"
                    placeholder="Search messages..."
                    className="pl-9"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setSelectedId(null)
                    }}
                  />
                </div>
              </div>

              <TabsContent value={view} className="space-y-2 p-3">
                {visibleMessages.map((message) => (
                  <Button
                    key={message.id}
                    ref={(element) => {
                      if (element) messageRefs.current.set(message.id, element)
                      else messageRefs.current.delete(message.id)
                    }}
                    variant="ghost"
                    className={cn(
                      'h-auto w-full min-w-0 flex-col items-stretch gap-2 rounded-lg border p-3 text-left whitespace-normal',
                      selectedId === message.id && 'bg-muted',
                    )}
                    aria-label={`Open message from ${message.sender}: ${message.subject}`}
                    aria-description={message.unread ? 'Unread message' : 'Read message'}
                    aria-pressed={selectedId === message.id}
                    onClick={() => {
                      openMessage(message)
                    }}
                  >
                    <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{message.sender}</span>
                        {message.unread && (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-foreground"
                            aria-label="Unread"
                          />
                        )}
                      </span>
                      <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
                        {formatDate(message.date)}
                      </span>
                    </span>
                    <span className="line-clamp-1 text-xs font-medium">{message.subject}</span>
                    <span className="line-clamp-2 text-xs leading-relaxed font-normal text-muted-foreground">
                      {message.preview}
                    </span>
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {message.label}
                    </Badge>
                  </Button>
                ))}
                {visibleMessages.length === 0 && (
                  <Empty className="min-h-64 px-3 md:px-3">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Search />
                      </EmptyMedia>
                      <EmptyTitle>No messages found</EmptyTitle>
                      <EmptyDescription>
                        {query
                          ? 'Try another name or keyword.'
                          : view === 'unread'
                            ? 'You’re all caught up. There are no unread messages.'
                            : 'There are no messages in this view.'}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch('')
                          setView('all')
                          setSelectedId(null)
                          searchRef.current?.focus()
                        }}
                      >
                        Show all messages
                      </Button>
                    </EmptyContent>
                  </Empty>
                )}
              </TabsContent>
            </Tabs>
          </section>

          <section
            aria-label="Message details"
            className={cn('min-w-0', !selected && 'hidden md:flex')}
          >
            {selected ? (
              <article aria-labelledby="message-subject" className="flex h-full flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b p-3 md:p-4">
                  {isMobile && (
                    <Button variant="ghost" size="sm" onClick={closeMessage}>
                      <ArrowLeft />
                      Back
                    </Button>
                  )}
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        toggleRead(selected)
                      }}
                    >
                      {selected.unread ? <MailOpen /> : <Mail />}
                      {selected.unread ? 'Mark read' : 'Mark unread'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        toggleArchive(selected)
                      }}
                    >
                      {selected.archived ? <ArchiveRestore /> : <Archive />}
                      {selected.archived ? 'Move to inbox' : 'Archive'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-5 p-5 xl:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selected.label}</Badge>
                    {selected.unread && <Badge variant="secondary">Unread</Badge>}
                    {selected.archived && <Badge variant="secondary">Archived</Badge>}
                  </div>
                  <h2
                    id="message-subject"
                    ref={detailHeadingRef}
                    tabIndex={-1}
                    className="text-xl leading-snug font-semibold tracking-tight outline-none"
                  >
                    {selected.subject}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="text-xs">{selected.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{selected.sender}</p>
                      <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
                    </div>
                    <time dateTime={selected.date} className="text-xs text-muted-foreground">
                      {formatDate(selected.date, { year: 'numeric' })}
                    </time>
                  </div>
                </div>
                <Separator />
                <div className="space-y-5 p-5 text-sm leading-7 xl:p-6">
                  {selected.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                <div className="mt-auto border-t p-5 text-xs text-muted-foreground xl:px-6">
                  This is a sample conversation for exploring the inbox.
                </div>
              </article>
            ) : (
              <Empty className="min-h-96">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Mail />
                  </EmptyMedia>
                  <EmptyTitle>Select a message</EmptyTitle>
                  <EmptyDescription>
                    Choose a conversation to read it and organize your sample inbox.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </section>
        </div>
      </Card>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
