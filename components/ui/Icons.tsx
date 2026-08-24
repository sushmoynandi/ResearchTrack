import React from 'react'

export function GithubIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

export function HuggingFaceIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-2.5 7a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 9.5 9Zm5 0a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 14.5 9ZM12 17.5a4.5 4.5 0 0 1-4.24-3h8.48A4.5 4.5 0 0 1 12 17.5Z" />
    </svg>
  )
}

export function LinkedInIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export function GoogleScholarIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.8 3.84v7.06h3.6V16.3L12 19.1l8.4-6.72v-1.78L12 0z" />
    </svg>
  )
}

export function OrcidIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.948-.947c0-.516.422-.947.948-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.016-5.325 5.016h-3.919V7.416zm1.444 1.303v7.444h2.297c1.562 0 3.703-.784 3.703-3.722 0-2.616-1.928-3.722-3.616-3.722h-2.384z" />
    </svg>
  )
}

export function TwitterXIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function ResearchGateIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.586 0c-.818 0-1.508.667-1.508 1.485 0 .818.69 1.485 1.508 1.485.818 0 1.485-.667 1.485-1.485C21.071.667 20.404 0 19.586 0zM1.08 7.391v14.444h4.469V7.391H1.08zm11.293 0c-4.444 0-6.938 3.125-6.938 7.222 0 4.17 2.494 7.222 6.938 7.222 2.222 0 3.97-.84 4.97-2.028v1.739h4.469V13.89c0-4.048-2.617-6.499-6.44-6.499zm.297 3.655c2.028 0 3.338 1.533 3.338 3.567 0 2.053-1.31 3.567-3.338 3.567-2.003 0-3.338-1.514-3.338-3.567 0-2.034 1.335-3.567 3.338-3.567z" />
    </svg>
  )
}
