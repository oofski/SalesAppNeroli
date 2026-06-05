import type { NeroliApi } from './index'

declare global {
  interface Window {
    neroli: NeroliApi
  }
}

export {}
