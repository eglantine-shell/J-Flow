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
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.9v2.2" />
      <path d="M12 18.9v2.2" />
      <path d="m5.6 5.6 1.6 1.6" />
      <path d="m16.8 16.8 1.6 1.6" />
      <path d="M2.9 12h2.2" />
      <path d="M18.9 12h2.2" />
      <path d="m5.6 18.4 1.6-1.6" />
      <path d="m16.8 7.2 1.6-1.6" />
      <path d="M9.4 4.5 8.7 6.4" />
      <path d="m15.3 17.6-.7 1.9" />
      <path d="m4.5 9.4 1.9.7" />
      <path d="m17.6 14.6 1.9.7" />
      <path d="m4.5 14.6 1.9-.7" />
      <path d="m17.6 9.4 1.9-.7" />
      <path d="m9.4 19.5-.7-1.9" />
      <path d="m15.3 6.4-.7-1.9" />
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
