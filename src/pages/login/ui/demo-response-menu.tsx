import { ChevronDown } from 'lucide-react'
import type { DemoLoginScenario } from '@/features/demo-session'
import { useTranslation } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

interface DemoResponseMenuProps {
  value: DemoLoginScenario
  onChange: (value: DemoLoginScenario) => void
  disabled: boolean
}

const scenarios = ['success', 'slow', 'failure'] as const satisfies readonly DemoLoginScenario[]

export function DemoResponseMenu({ value, onChange, disabled }: DemoResponseMenuProps) {
  const { t } = useTranslation('demoLogin')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="h-auto min-h-9 max-w-full whitespace-normal text-muted-foreground"
        >
          {value === 'success' ? t('demoResponse') : t('selectedResponse', { mode: t(value) })}
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label={t('demoResponse')}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            const scenario = scenarios.find((item) => item === next)
            if (scenario) onChange(scenario)
          }}
        >
          {scenarios.map((scenario) => (
            <DropdownMenuRadioItem key={scenario} value={scenario}>
              {t(scenario)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
