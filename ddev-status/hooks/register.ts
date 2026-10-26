import type { EngineInterface, Register } from 'claude-code'


const TASK = /^\s*- \[([ xX])\]/gm

/**
 * Status line: "master ●3 · DDEV ✓ · user-library 13/15".
 * Refreshed when the session starts, after every turn and every 30 seconds.
 */
export const register: Register = on => {
  let cancel: (() => void) | undefined

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    void refresh($)
    cancel?.()
    cancel = $.clock.every(30000, () => refresh($)).cancel
    return started
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    void refresh($)
    return done
  })
}

/**
 * Recomputes the status line.
 */
async function refresh($: EngineInterface): Promise<void> {
  const parts: string[] = []
  // From the project root: relative paths follow the working directory, which
  // moves with every `cd` of the shell, and the line would lose DDEV and OpenSpec.
  const root = await $.session.root()

  const branch = await run($, ['git', 'rev-parse', '--abbrev-ref', 'HEAD'], root)
  if (branch !== null) {
    const changes = (await run($, ['git', 'status', '--porcelain'], root))?.split('\n').filter(Boolean).length ?? 0
    parts.push(changes > 0 ? `${branch} ●${changes}` : branch)
  }

  const ddev = await readDdevName($, root)
  if (ddev !== null) {
    const state = await run($, ['docker', 'ps', '--filter', `name=ddev-${ddev}-web`, '--format', '{{.Status}}'], root)
    parts.push(state ? 'DDEV ✓' : 'DDEV ✗')
  }

  parts.push(...(await openspecProgress($, root)))
  $.ui.status(parts.length ? parts.join(' · ') : undefined)
}

/**
 * Runs a command; its trimmed output on success, null otherwise.
 */
async function run($: EngineInterface, argv: readonly string[], cwd: string): Promise<string | null> {
  try {
    const { exitCode, stdout } = await $.process.run(argv, { cwd, timeoutMs: 10000 })
    return exitCode === 0 ? stdout.trim() : null
  }
  catch {
    return null
  }
}

/**
 * Returns the DDEV project name from .ddev/config.yaml, if any.
 */
async function readDdevName($: EngineInterface, root: string): Promise<string | null> {
  try {
    const config = String(await $.fs.read(`${root}/.ddev/config.yaml`))
    return config.match(/^name:\s*["']?([\w.-]+)/m)?.[1] ?? null
  }
  catch {
    return null
  }
}

/**
 * Returns "change done/total" for each active OpenSpec change.
 */
async function openspecProgress($: EngineInterface, root: string): Promise<string[]> {
  try {
    const entries = await $.fs.list(`${root}/openspec/changes`)
    const progress: string[] = []
    for (const entry of entries) {
      if (entry.kind !== 'dir' || entry.name === 'archive') {
        continue
      }
      try {
        const tasks = String(await $.fs.read(`${root}/openspec/changes/${entry.name}/tasks.md`))
        const marks = [...tasks.matchAll(TASK)].map(match => match[1])
        const done = marks.filter(mark => mark !== ' ').length
        progress.push(done === marks.length && marks.length > 0 ? `${entry.name} ✓` : `${entry.name} ${done}/${marks.length}`)
      }
      catch {
        progress.push(`${entry.name} (no tasks)`)
      }
    }
    return progress
  }
  catch {
    return []
  }
}
