import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="2.7" />
      <path d="M12 4.1 13.5 5l1.8-.5.9 1.6-.9 1.6.6 1.5 1.6.6 1.6-.9 1.6.9v1.8l-1.6.9-.5 1.8 1 1.5-.9 1.6-1.8-.4-1.5 1-1 .9h-1.8l-.9-1.6-1.8-.5-1.5 1-.9-.5-.9-1.6 1-1.5-.6-1.8-1.6-.9v-1.8l1.6-.9.5-1.8-1-1.5.9-1.6 1.8.4L10.5 5Z" />
    </BaseIcon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m5.5 12.5 4.2 4.2 8.8-9" />
    </BaseIcon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </BaseIcon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.4" />
      <path d="M12 18.8v2.4" />
      <path d="m5.6 5.6 1.7 1.7" />
      <path d="m16.7 16.7 1.7 1.7" />
      <path d="M2.8 12h2.4" />
      <path d="M18.8 12h2.4" />
      <path d="m5.6 18.4 1.7-1.7" />
      <path d="m16.7 7.3 1.7-1.7" />
    </BaseIcon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15.8 3.7a7.8 7.8 0 1 0 4.5 13.8 8.4 8.4 0 1 1-4.5-13.8Z" />
    </BaseIcon>
  )
}
