import { MapPinOff } from 'lucide-react'
import { Component, type ReactNode } from 'react'

/** MapLibre needs WebGL; show a quiet placeholder instead of a broken screen without it. */
export class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid h-full place-items-center bg-surface p-6 text-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <MapPinOff className="size-5" aria-hidden />
          <p className="text-[13px]">Žemėlapio šiame įrenginyje įkelti nepavyko.</p>
        </div>
      </div>
    )
  }
}
