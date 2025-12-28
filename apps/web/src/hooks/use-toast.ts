"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

// Toast type definition
type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

// Wrapper hook for toast functionality
// Uses sonner under the hood but provides a simpler API
export function useToast() {
  const toast = React.useCallback((props: ToastProps) => {
    const { title, description, variant } = props
    
    if (variant === "destructive") {
      sonnerToast.error(title, {
        description,
      })
    } else {
      sonnerToast.success(title, {
        description,
      })
    }
  }, [])

  return { toast }
}

// Direct toast function for non-hook usage
export { sonnerToast as toast }
