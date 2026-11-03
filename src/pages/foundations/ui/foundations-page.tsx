import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleAlert,
  Folder,
  Globe,
  Inbox,
  LayoutDashboard,
  RotateCcw,
  Settings,
} from 'lucide-react'
import { AnimatedNumber } from '@/features/number-motion'
import { formatNumber } from '@/shared/lib/format'
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

const railItems = [
  { label: '대시보드', icon: LayoutDashboard },
  { label: '받은편지함', icon: Inbox },
  { label: '설정', icon: Settings },
]
const sampleTimestamp = new Date('2026-11-04T06:30:00Z')
const formatInteger = (value: number) => formatNumber(value, { maximumFractionDigits: 0 })

function BasicsExamples() {
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>세 가지 두께, 분명한 위계</h2>
          </CardTitle>
          <CardDescription>Pretendard · 한글과 영문을 같은 기준으로 읽습니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div>
            <p className="text-2xl font-semibold tracking-tight">다음 프로젝트를 준비하세요</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              필요한 정보를 먼저 보여주고, 설명은 짧게 이어갑니다. Plan your next project.
            </p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-4 text-sm">
            <dt className="text-muted-foreground">400 · Regular</dt>
            <dd className="font-normal">본문과 입력값</dd>
            <dt className="text-muted-foreground">500 · Medium</dt>
            <dd className="font-medium">레이블과 버튼</dd>
            <dt className="text-muted-foreground">600 · SemiBold</dt>
            <dd className="font-semibold">제목과 핵심 수치</dd>
          </dl>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>색상은 역할에 맞게</h2>
          </CardTitle>
          <CardDescription>주요 행동은 neutral, 브랜드는 정체성을 나타냅니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-lg bg-primary p-4 text-primary-foreground">
              <p className="text-sm font-medium">Primary</p>
              <p className="mt-1 text-xs">가장 중요한 행동</p>
            </div>
            <div className="rounded-lg bg-brand p-4 text-brand-foreground">
              <p className="text-sm font-medium">Blueprint Blue</p>
              <p className="mt-1 text-xs">브랜드 정체성</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              <Check aria-hidden="true" />
              완료
            </Badge>
            <Badge variant="secondary">진행 중</Badge>
            <Badge variant="outline">초안</Badge>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            일반 상태는 텍스트와 아이콘으로 구분합니다. 오류와 삭제에는 destructive를 사용합니다.
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 md:col-span-2">
        <CardHeader>
          <CardTitle>
            <h2>같은 기본값으로 조합하기</h2>
          </CardTitle>
          <CardDescription>
            컴포넌트의 형태를 유지하고 화면의 목적에 맞춰 배치합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['shadcn UI', '버튼·폼·탭·대화상자는 설치된 컴포넌트를 사용합니다.'],
            ['Tailwind', '의미 토큰과 레이아웃 클래스로 화면을 조합합니다.'],
            ['접근성', '이름·레이블·초점과 키보드 동작을 함께 유지합니다.'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border p-4">
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function LayoutExamples() {
  const [railSelection, setRailSelection] = useState('대시보드')
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <ArrowRight className="size-4" aria-hidden="true" />
              가로 묶음
            </h2>
          </CardTitle>
          <CardDescription>아이콘과 액션은 유지하고 텍스트가 남은 폭을 사용합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Folder className="size-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title="2026년 하반기 글로벌 운영 보고서">
                2026년 하반기 글로벌 운영 보고서
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                긴 제목도 액션을 밀어내지 않습니다.
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              초안
            </Badge>
          </div>
          <code className="rounded-md bg-muted p-3 text-xs leading-5 break-words text-muted-foreground">
            flex items-center gap-3 · min-w-0 flex-1 · shrink-0
          </code>
          <p className="text-sm leading-6 text-muted-foreground">
            가로축은 justify, 세로축은 items로 정렬합니다.
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <ArrowDown className="size-4" aria-hidden="true" />
              세로 묶음
            </h2>
          </CardTitle>
          <CardDescription>제목·설명·상태 사이의 간격을 부모가 소유합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col items-start gap-3 rounded-lg border p-4">
            <p className="text-sm font-medium">출시 준비</p>
            <p className="text-sm leading-6 text-muted-foreground">
              담당자와 기한을 확인하고 다음 작업을 진행하세요.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">디자인 검토</Badge>
              <Badge variant="outline">문구 확인</Badge>
              <Badge variant="outline">접근성 확인</Badge>
            </div>
          </div>
          <code className="rounded-md bg-muted p-3 text-xs leading-5 break-words text-muted-foreground">
            flex flex-col items-start gap-3 · flex-wrap gap-2
          </code>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>가운데 정렬된 아이콘 레일</h2>
          </CardTitle>
          <CardDescription>같은 너비 안에 아이콘을 배치하고 이름은 유지합니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div
            className="flex w-14 shrink-0 flex-col items-center gap-2 rounded-lg border bg-muted/30 py-3"
            aria-label="탐색 레일 예시"
          >
            {railItems.map(({ label, icon: Icon }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant={railSelection === label ? 'secondary' : 'ghost'}
                    aria-label={label}
                    aria-pressed={railSelection === label}
                    onClick={() => {
                      setRailSelection(label)
                    }}
                  >
                    <Icon className="shrink-0" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium" aria-live="polite">
              선택: {railSelection}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              배지나 감춘 텍스트 때문에 아이콘 중심이 움직이지 않게 합니다.
            </p>
            <code className="text-xs break-words text-muted-foreground">
              items-center justify-center
            </code>
          </div>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>세 가지 화면 구간</h2>
          </CardTitle>
          <CardDescription>화면을 줄여도 읽기 순서와 콘텐츠를 유지합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt>모바일</dt>
              <dd className="text-muted-foreground">768px 미만 · 1열</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>태블릿</dt>
              <dd className="text-muted-foreground">768px부터 · 1–2열</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>PC</dt>
              <dd className="text-muted-foreground">1280px부터 · 2–4열</dd>
            </div>
          </dl>
          <code className="block rounded-md bg-muted p-3 text-xs leading-5 break-words text-muted-foreground">
            grid gap-4 md:grid-cols-2 xl:grid-cols-3
          </code>
          <p className="text-sm leading-6 text-muted-foreground">
            필터는 줄바꿈하고 표는 영역 안에서 스크롤합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ContentExamples() {
  const [locale, setLocale] = useState('ko-KR')
  const [timeZone, setTimeZone] = useState('Asia/Seoul')
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>행동과 결과가 보이는 문구</h2>
          </CardTitle>
          <CardDescription>운영자가 다음 행동을 판단하는 데 필요한 내용을 씁니다.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {[
            ['행동', '변경 사항 저장', '버튼은 할 일을 구체적으로 말합니다.'],
            ['성공', '프로젝트 이름을 변경했어요.', '실제로 끝난 결과만 알립니다.'],
            [
              '오류',
              '저장하지 못했어요. 다시 시도해 주세요.',
              '실패한 작업과 다음 행동을 연결합니다.',
            ],
            ['빈 결과', '일치하는 프로젝트가 없어요.', '검색어나 필터를 바꿀 수 있게 안내합니다.'],
          ].map(([label, example, description]) => (
            <div key={label} className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0">
                {label}
              </Badge>
              <div className="min-w-0">
                <p className="text-sm leading-6 font-medium">{example}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <Globe className="size-4" aria-hidden="true" />
              같은 데이터, 다른 표기
            </h2>
          </CardTitle>
          <CardDescription>언어와 시간대를 선택해 Intl 표기를 비교하세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="foundation-locale">표시 언어</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger id="foundation-locale" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko-KR">한국어</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="de-DE">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundation-timezone">시간대</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger id="foundation-timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Seoul">Asia/Seoul</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New_York</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <dl className="space-y-4 rounded-lg border p-4" aria-live="polite">
            <div>
              <dt className="text-xs text-muted-foreground">금액 · USD</dt>
              <dd className="mt-1 text-2xl font-semibold break-words tabular-nums">
                {new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(
                  12480.5,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">예시 시각 · {timeZone}</dt>
              <dd className="mt-1 text-sm">
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone,
                }).format(sampleTimestamp)}
              </dd>
            </div>
          </dl>
          <p className="text-xs leading-5 text-muted-foreground">
            표시 언어를 바꿔도 통화는 USD입니다. 이 예시는 앱 전체 번역이나 RTL 지원을 의미하지
            않습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function FeedbackExamples() {
  const [value, setValue] = useState(12840)
  const [recovered, setRecovered] = useState(false)
  return (
    <div className="grid min-w-0 gap-5 md:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>숫자가 바뀌는 순간</h2>
          </CardTitle>
          <CardDescription>
            데이터의 변화를 짧게 연결하고 최종 값을 분명하게 보여줍니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="rounded-lg border p-5">
            <p className="text-sm text-muted-foreground">방문 수 · 예시 데이터</p>
            <AnimatedNumber
              value={value}
              format={formatInteger}
              className="mt-2 text-3xl font-semibold tracking-tight"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setValue((current) => (current === 12840 ? 19260 : 12840))
              }}
            >
              값 변경
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setValue(12840)
              }}
            >
              <RotateCcw aria-hidden="true" />
              초기화
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            움직임 줄이기를 켜면 최종 값이 즉시 표시됩니다. 화면낭독기에는 최종 값만 제공합니다.
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2>오류와 복구를 함께 안내</h2>
          </CardTitle>
          <CardDescription>
            요청 결과의 문구 예시입니다. 실제 API를 호출하지 않습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div aria-live="polite">
            {recovered ? (
              <Alert>
                <Check aria-hidden="true" />
                <AlertTitle>프로젝트 목록을 불러왔어요.</AlertTitle>
                <AlertDescription>기존 작업을 이어갈 수 있어요.</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>프로젝트 목록을 불러오지 못했어요.</AlertTitle>
                <AlertDescription>
                  잠시 후 다시 시도해 주세요. 작성 중인 내용은 유지돼요.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <Button
            className="self-start"
            variant="outline"
            onClick={() => {
              setRecovered((current) => !current)
            }}
          >
            {recovered ? '오류 예시 보기' : '복구 예시 보기'}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            실제 화면의 재시도 버튼은 해당 요청을 다시 실행합니다. 원인을 모르면 오류 이유를
            단정하지 않습니다.
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 md:col-span-2">
        <CardHeader>
          <CardTitle>
            <h2>내용의 자리를 보존하는 로딩</h2>
          </CardTitle>
          <CardDescription>
            초기 로딩의 구조 예시입니다. 갱신 중에는 기존 데이터를 유지합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="space-y-3 rounded-lg border p-4" aria-hidden="true">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function FoundationsPage() {
  return (
    <div lang="ko" className="min-w-0 space-y-7">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Foundations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Blueprint의 화면을 구성하는 기준입니다. 글자, 정렬, 문구와 상태를 실제 조합으로
            확인하세요.
          </p>
        </div>
        <Badge variant="outline" className="self-start">
          Blueprint 기준
        </Badge>
      </header>
      <Tabs defaultValue="basics" className="min-w-0">
        <div className="min-w-0 overflow-x-auto pb-1">
          <TabsList aria-label="디자인 기준">
            <TabsTrigger value="basics">기본</TabsTrigger>
            <TabsTrigger value="layout">레이아웃</TabsTrigger>
            <TabsTrigger value="content">문구·국제화</TabsTrigger>
            <TabsTrigger value="feedback">피드백</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="basics" className="mt-4 min-w-0">
          <BasicsExamples />
        </TabsContent>
        <TabsContent value="layout" className="mt-4 min-w-0">
          <LayoutExamples />
        </TabsContent>
        <TabsContent value="content" className="mt-4 min-w-0">
          <ContentExamples />
        </TabsContent>
        <TabsContent value="feedback" className="mt-4 min-w-0">
          <FeedbackExamples />
        </TabsContent>
      </Tabs>
      <footer className="flex flex-col gap-3 border-t pt-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p className="leading-5">
          SEED는 설계 관점의 참고 자료입니다. 이 화면은 기존 shadcn·Tailwind·Pretendard로
          구성했습니다.
        </p>
        <Button asChild variant="link" size="sm" className="h-auto self-start p-0 text-xs">
          <a href="https://seed-design.io/foundations" target="_blank" rel="noreferrer">
            참고 문서
            <ArrowUpRight aria-hidden="true" />
          </a>
        </Button>
      </footer>
    </div>
  )
}
