import {
  CircleAlert,
  Check,
  Ellipsis,
  Moon,
  PencilLine,
  Plus,
  Repeat2,
  Save,
  Settings2,
  SunMedium,
  X,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export type IconProps = LucideProps

const defaultProps: IconProps = {
  'aria-hidden': true,
  strokeWidth: 1.9,
}

export function SettingsIcon(props: IconProps) {
  return <Settings2 {...defaultProps} {...props} />
}

export function CheckIcon(props: IconProps) {
  return <Check {...defaultProps} {...props} />
}

export function CloseIcon(props: IconProps) {
  return <X {...defaultProps} {...props} />
}

export function PlusIcon(props: IconProps) {
  return <Plus {...defaultProps} {...props} />
}

export function SunIcon(props: IconProps) {
  return <SunMedium {...defaultProps} {...props} />
}

export function MoonIcon(props: IconProps) {
  return <Moon {...defaultProps} {...props} />
}

export function EditIcon(props: IconProps) {
  return <PencilLine {...defaultProps} {...props} />
}

export function SaveIcon(props: IconProps) {
  return <Save {...defaultProps} {...props} />
}

export function MoreIcon(props: IconProps) {
  return <Ellipsis {...defaultProps} {...props} />
}

export function RepeatIcon(props: IconProps) {
  return <Repeat2 {...defaultProps} {...props} />
}

export function ImportantIcon(props: IconProps) {
  return <CircleAlert {...defaultProps} {...props} />
}
