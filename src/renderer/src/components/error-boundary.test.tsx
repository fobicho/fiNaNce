import { useEffect } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './error-boundary'

function Boom(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('limpia el error cuando cambia resetKey', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Boom />
      </ErrorBoundary>
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKey="/b">
        <div>otra vista</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('otra vista')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument()
  })

  it('no remonta los hijos cuando cambia resetKey', () => {
    let mounts = 0

    function Child() {
      useEffect(() => {
        mounts++
      }, [])
      return <div>contenido</div>
    }

    const { rerender } = render(
      <ErrorBoundary resetKey="/a">
        <Child />
      </ErrorBoundary>
    )
    expect(mounts).toBe(1)

    rerender(
      <ErrorBoundary resetKey="/b">
        <Child />
      </ErrorBoundary>
    )

    expect(mounts).toBe(1)
  })
})