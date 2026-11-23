import type { YAMLMap } from 'yaml'

export interface ManifestPlugin {
  name: string
  spec: string
}

export interface AggregateManifest {
  path: string
  dir: string
  name: string
  version: string
  private: boolean
  description?: string
  license?: string
  keywords?: string[]
  engines?: Record<string, string>
  patch: string
  plugins: ManifestPlugin[]
}

export interface PatchRow {
  row: YAMLMap
  file: string
}

export interface AggregateRow extends PatchRow {
  plugin: string
  id: string
}

export interface ResolvedPlugin extends ManifestPlugin {
  dir: string
  pkg: Record<string, unknown>
  patchFiles: string[]
  rows: PatchRow[]
}

export type DependencyEntries = Array<[name: string, spec: string]>

export interface AggregatePlan {
  plugins: ResolvedPlugin[]
  rows: AggregateRow[]
  dependencies: DependencyEntries
}
