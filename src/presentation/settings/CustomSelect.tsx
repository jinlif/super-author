import * as Select from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import './CustomSelect.css'

interface SelectOption {
  value: string
  label: string
}

interface SelectGroup {
  label: string
  options: SelectOption[]
}

interface CustomSelectProps {
  value: string
  onValueChange: (value: string) => void
  options?: SelectOption[]
  groups?: SelectGroup[]
  placeholder?: string
  className?: string
  size?: 'default' | 'small'
}

export function CustomSelect({
  value,
  onValueChange,
  options,
  groups,
  placeholder = '选择...',
  className,
  size = 'default',
}: CustomSelectProps) {
  const triggerClass = [
    'cs-trigger',
    size === 'small' ? 'cs-trigger-small' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger className={triggerClass}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="cs-icon">
          <ChevronDown size={size === 'small' ? 10 : 12} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="cs-content" position="popper" sideOffset={4}>
          <Select.Viewport className="cs-viewport">
            {groups
              ? groups.map((group, gi) => (
                  <Select.Group key={gi} className="cs-group">
                    <Select.Label className="cs-label">{group.label}</Select.Label>
                    {group.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    {gi < groups.length - 1 && <Select.Separator className="cs-separator" />}
                  </Select.Group>
                ))
              : options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Select.Item className="cs-item" value={value}>
      <Select.ItemIndicator className="cs-indicator">
        <Check size={12} />
      </Select.ItemIndicator>
      <Select.ItemText className="cs-item-text">{children}</Select.ItemText>
    </Select.Item>
  )
}
