'use client'

import React from 'react'
import { generateLQIP } from '@/lib/hestia/mascot-lqip'

export interface MascotBackgroundProps {
  children: React.ReactNode
  mode?: 'prominent' | 'watermark'
  className?: string
  mascotKey?: 'hestia' | 'pluto'
  style?: React.CSSProperties
}

export function MascotBackground({
  children,
  mode = 'prominent',
  className,
  mascotKey = 'hestia',
  style: styleProp,
  ...rest
}: MascotBackgroundProps) {
  const { lqipBase64 } = generateLQIP(mascotKey)

  const isProminent = mode === 'prominent'
  const isWatermark = mode === 'watermark'

  const internalStyle: React.CSSProperties & Record<string, string | number> = {
    '--mascot-bg-lqip': lqipBase64,
    '--mascot-bg-opacity': isProminent ? 1 : 0.12,
    '--mascot-transition-duration': '300ms',
  }

  if (isProminent) {
    internalStyle['--mascot-overlay-bg'] = 'oklch(0.145 0 0 / 0.7)'
    internalStyle['--mascot-overlay-text'] = 'oklch(0.985 0 0)'
  }

  if (isWatermark) {
    internalStyle['contentVisibility'] = 'auto'
  }

  const mergedStyle = { ...internalStyle, ...styleProp }

  const transitionClass = `mascot-transition${isWatermark ? '' : ''}`

  const classNames = [
    'mascot-background',
    transitionClass,
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </div>
  )
}