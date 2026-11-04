import { useRef, useState } from 'react'
import { Archive, ArchiveRestore, ArrowLeft, Inbox, Mail, MailOpen, Search } from 'lucide-react'
import { useIsMobile } from '@/shared/hooks/use-mobile'
import { useFormatters, useTranslation } from '@/shared/lib/i18n'
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
import { PageHeader } from '@/shared/ui/page-header'
import { Separator } from '@/shared/ui/separator'
import { HStack, VStack } from '@/shared/ui/stack'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { sampleMessages, type SampleMessage } from '../model/sample-messages'

type InboxView = 'all' | 'unread' | 'archived'

export function InboxPage() {
  const { t } = useTranslation('admin')
  const { formatDate, formatNumber } = useFormatters()
  const labelNames: Record<string, string> = {
    Product: t('inbox.labels.Product'),
    Design: t('inbox.labels.Design'),
    Customers: t('inbox.labels.Customers'),
    Updates: t('inbox.labels.Updates'),
    Team: t('inbox.labels.Team'),
  }
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState(sampleMessages)
  const [view, setView] = useState<InboxView>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState<{
    key: 'markedRead' | 'markedUnread' | 'movedToInbox' | 'archivedMessage'
    subject: string
  } | null>(null)
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
    setAnnouncement({
      key: message.unread ? 'markedRead' : 'markedUnread',
      subject: message.subject,
    })
  }

  function toggleArchive(message: SampleMessage) {
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id ? { ...item, archived: !item.archived } : item,
      ),
    )
    setSelectedId(null)
    setAnnouncement({
      key: message.archived ? 'movedToInbox' : 'archivedMessage',
      subject: message.subject,
    })
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  return (
    <VStack align="stretch" className="gap-6">
      <PageHeader
        title={t('inbox.title')}
        description={t('inbox.intro')}
        badgeLabel={t('common.sample')}
      />

      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <HStack justify="between" wrap className="gap-3 border-b p-4 md:px-5">
          <HStack className="gap-2 text-sm font-medium">
            <Inbox className="size-4" />
            {t('inbox.allMessages')}
            <Badge variant="outline">
              {t('inbox.unreadCount', { total: formatNumber(unreadCount) })}
            </Badge>
          </HStack>
          <p className="text-xs text-muted-foreground">{t('inbox.sampleHint')}</p>
        </HStack>
        <div className="grid min-h-[620px] md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <section
            aria-label={t('inbox.messageList')}
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
              <VStack align="stretch" className="gap-4 border-b p-4">
                <TabsList className="w-full" aria-label={t('inbox.messageViews')}>
                  <TabsTrigger value="all">{t('inbox.all')}</TabsTrigger>
                  <TabsTrigger value="unread">{t('inbox.unread')}</TabsTrigger>
                  <TabsTrigger value="archived">{t('inbox.archived')}</TabsTrigger>
                </TabsList>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    aria-label={t('inbox.search')}
                    placeholder={t('inbox.searchPlaceholder')}
                    className="pl-9"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setSelectedId(null)
                    }}
                  />
                </div>
              </VStack>

              <VStack asChild align="stretch" className="gap-2 p-3">
                <TabsContent value={view}>
                  {visibleMessages.map((message) => (
                    <VStack asChild key={message.id} align="stretch" className="gap-2">
                      <Button
                        ref={(element) => {
                          if (element) messageRefs.current.set(message.id, element)
                          else messageRefs.current.delete(message.id)
                        }}
                        variant="ghost"
                        className={cn(
                          'h-auto w-full min-w-0 rounded-lg border p-3 text-left whitespace-normal',
                          selectedId === message.id && 'bg-muted',
                        )}
                        aria-label={t('inbox.openMessage', {
                          sender: message.sender,
                          subject: message.subject,
                        })}
                        aria-description={
                          message.unread ? t('inbox.unreadMessage') : t('inbox.readMessage')
                        }
                        aria-pressed={selectedId === message.id}
                        onClick={() => {
                          openMessage(message)
                        }}
                      >
                        <HStack asChild justify="between" className="min-w-0 gap-2">
                          <span>
                            <HStack asChild className="min-w-0 gap-2">
                              <span>
                                <span className="truncate font-medium">{message.sender}</span>
                                {message.unread && (
                                  <span
                                    className="size-1.5 shrink-0 rounded-full bg-foreground"
                                    aria-label={t('inbox.unread')}
                                  />
                                )}
                              </span>
                            </HStack>
                            <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
                              {formatDate(message.date)}
                            </span>
                          </span>
                        </HStack>
                        <span className="line-clamp-1 text-xs font-medium">{message.subject}</span>
                        <span className="line-clamp-2 text-xs leading-relaxed font-normal text-muted-foreground">
                          {message.preview}
                        </span>
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {labelNames[message.label] ?? message.label}
                        </Badge>
                      </Button>
                    </VStack>
                  ))}
                  {visibleMessages.length === 0 && (
                    <Empty className="min-h-64 px-3 md:px-3">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Search />
                        </EmptyMedia>
                        <EmptyTitle>{t('inbox.noMessages')}</EmptyTitle>
                        <EmptyDescription>
                          {query
                            ? t('inbox.searchHint')
                            : view === 'unread'
                              ? t('inbox.caughtUp')
                              : t('inbox.emptyView')}
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
                          {t('inbox.showAll')}
                        </Button>
                      </EmptyContent>
                    </Empty>
                  )}
                </TabsContent>
              </VStack>
            </Tabs>
          </section>

          <VStack asChild align="stretch" className={cn('min-w-0', !selected && 'hidden md:flex')}>
            <section aria-label={t('inbox.details')}>
              {selected ? (
                <VStack asChild align="stretch" className="h-full shrink-0">
                  <article aria-labelledby="message-subject">
                    <HStack wrap className="gap-2 border-b p-3 md:p-4">
                      {isMobile && (
                        <Button variant="ghost" size="sm" onClick={closeMessage}>
                          <ArrowLeft />
                          {t('inbox.back')}
                        </Button>
                      )}
                      <HStack wrap className="ml-auto gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleRead(selected)
                          }}
                        >
                          {selected.unread ? <MailOpen /> : <Mail />}
                          {selected.unread ? t('inbox.markRead') : t('inbox.markUnread')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toggleArchive(selected)
                          }}
                        >
                          {selected.archived ? <ArchiveRestore /> : <Archive />}
                          {selected.archived ? t('inbox.moveInbox') : t('inbox.archive')}
                        </Button>
                      </HStack>
                    </HStack>
                    <VStack align="stretch" className="gap-5 p-5 xl:p-6">
                      <HStack wrap className="gap-2">
                        <Badge variant="outline">
                          {labelNames[selected.label] ?? selected.label}
                        </Badge>
                        {selected.unread && <Badge variant="secondary">{t('inbox.unread')}</Badge>}
                        {selected.archived && (
                          <Badge variant="secondary">{t('inbox.archived')}</Badge>
                        )}
                      </HStack>
                      <h2
                        id="message-subject"
                        ref={detailHeadingRef}
                        tabIndex={-1}
                        className="text-xl leading-snug font-semibold tracking-tight outline-none"
                      >
                        {selected.subject}
                      </h2>
                      <HStack wrap className="gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="text-xs">{selected.initials}</AvatarFallback>
                        </Avatar>
                        <VStack align="stretch" className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{selected.sender}</p>
                          <p className="truncate text-xs text-muted-foreground">{selected.email}</p>
                        </VStack>
                        <time dateTime={selected.date} className="text-xs text-muted-foreground">
                          {formatDate(selected.date, { year: 'numeric' })}
                        </time>
                      </HStack>
                    </VStack>
                    <Separator />
                    <VStack align="stretch" className="gap-5 p-5 text-sm leading-7 xl:p-6">
                      {selected.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </VStack>
                    <div className="mt-auto border-t p-5 text-xs text-muted-foreground xl:px-6">
                      {t('inbox.disclaimer')}
                    </div>
                  </article>
                </VStack>
              ) : (
                <Empty className="min-h-96">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Mail />
                    </EmptyMedia>
                    <EmptyTitle>{t('inbox.selectMessage')}</EmptyTitle>
                    <EmptyDescription>{t('inbox.selectHint')}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </section>
          </VStack>
        </div>
      </Card>
      <p role="status" className="sr-only">
        {announcement ? t(`inbox.${announcement.key}`, { subject: announcement.subject }) : ''}
      </p>
    </VStack>
  )
}
