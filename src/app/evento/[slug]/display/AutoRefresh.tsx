'use client'

import { useEffect } from 'react'

export default function AutoRefresh() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload()
    }, 30000)
    return () => clearTimeout(timer)
  }, [])
  return null
}