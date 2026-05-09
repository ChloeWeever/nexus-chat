import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store'
import type { PetConfig } from '@/types'
import { cn } from '@/lib/utils'

interface ManifestPet {
  slug: string
  displayName: string
  kind: 'character' | 'creature' | 'object'
  submittedBy: string | null
  spritesheetUrl: string
  petJsonUrl: string
  zipUrl: string | null
}

const KIND_COLORS: Record<string, string> = {
  character: 'text-purple-400 bg-purple-400/10',
  creature: 'text-emerald-400 bg-emerald-400/10',
  object: 'text-sky-400 bg-sky-400/10',
}

export default function PetdexGallery(): JSX.Element {
  const { settings, updateSettings } = useAppStore()
  const [pets, setPets] = useState<ManifestPet[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [preview, setPreview] = useState<ManifestPet | null>(null)

  const PAGE_SIZE = 24

  useEffect(() => {
    setLoading(true)
    window.api.pet.fetchManifest()
      .then((result) => {
        if (result.error) {
          setError(result.error)
        } else {
          const data = result.data as { pets: ManifestPet[] }
          setPets(data.pets ?? [])
        }
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const allFiltered = pets.filter(
    (p) =>
      search === '' ||
      p.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.max(1, Math.ceil(allFiltered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const filtered = allFiltered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const selectPet = useCallback(
    (pet: ManifestPet) => {
      const config: PetConfig = {
        slug: pet.slug,
        displayName: pet.displayName,
        spritesheetUrl: pet.spritesheetUrl,
      }
      updateSettings({ pet: config })
      setPreview(null)
    },
    [updateSettings]
  )

  const clearPet = useCallback(() => {
    updateSettings({ pet: null })
  }, [updateSettings])

  const activePet = settings.pet

  return (
    <div className="space-y-3">
      {/* Current pet */}
      {activePet && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded shrink-0 overflow-hidden border border-border/50"
              style={{ imageRendering: 'auto' }}
            >
              <img
                src={activePet.spritesheetUrl}
                alt={activePet.displayName}
                style={{
                  width: '100%',
                  height: 'auto',
                  transform: 'scale(8) translate(-43.75%, -44.4%)',
                  transformOrigin: '0 0',
                  imageRendering: 'auto',
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium">{activePet.displayName}</p>
              <p className="text-xs text-muted-foreground">Active pet</p>
            </div>
          </div>
          <button
            onClick={clearPet}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
          >
            Remove pet
          </button>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0) }}
        placeholder="Search pets..."
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
      />

      {/* Status */}
      {loading && (
        <p className="text-xs text-muted-foreground text-center py-4">Loading Petdex gallery...</p>
      )}
      {error && (
        <p className="text-xs text-destructive text-center py-4">Failed to load: {error}</p>
      )}

      {/* Grid */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {filtered.map((pet) => (
              <button
                key={pet.slug}
                onClick={() => setPreview(pet)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all',
                  activePet?.slug === pet.slug
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-border/80 hover:bg-muted/30'
                )}
              >
                <div className="h-8 w-8 rounded overflow-hidden border border-border/40 shrink-0 bg-muted/30">
                  <img
                    src={pet.spritesheetUrl}
                    alt={pet.displayName}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 'auto',
                      transform: 'scale(8) translate(-43.75%, -44.4%)',
                      transformOrigin: '0 0',
                      imageRendering: 'auto',
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{pet.displayName}</p>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                      KIND_COLORS[pet.kind] ?? 'text-muted-foreground bg-muted/30'
                    )}
                  >
                    {pet.kind}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {pets.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-muted-foreground">
                {safePage + 1} / {totalPages} &nbsp;·&nbsp; {allFiltered.length} pets
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="rounded-xl border border-border bg-background p-5 shadow-2xl w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="h-16 w-16 rounded-lg overflow-hidden border border-border/50 bg-muted/30 shrink-0">
                <img
                  src={preview.spritesheetUrl}
                  alt={preview.displayName}
                  style={{
                    width: '100%',
                    height: 'auto',
                    transform: 'scale(8) translate(-43.75%, -44.4%)',
                    transformOrigin: '0 0',
                    imageRendering: 'auto',
                  }}
                />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{preview.displayName}</h3>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', KIND_COLORS[preview.kind] ?? '')}>
                  {preview.kind}
                </span>
                {preview.submittedBy && (
                  <p className="text-xs text-muted-foreground mt-1">by {preview.submittedBy}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectPet(preview)}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {activePet?.slug === preview.slug ? 'Already active' : 'Use this pet'}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
