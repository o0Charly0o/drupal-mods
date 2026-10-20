import type { Register } from 'claude-code'

/**
 * Commands that destroy data or code that git cannot bring back. Each one is
 * put to the person in the permission dialog, whatever the allow rules say.
 */
const DESTRUCTIVE: ReadonlyArray<[RegExp, string]> = [
  [/\b(site:install|site-install)\b|\bdrush\s+si\b/, 'reinstalls the Drupal site (wipes the database)'],
  [/\bsql:drop\b|\bsql-drop\b|\bDROP\s+(TABLE|DATABASE)\b|\bTRUNCATE\b/i, 'drops or empties database tables'],
  [/\bentity:delete\b|\bentity-delete\b/, 'deletes Drupal entities in bulk'],
  [/\bddev\s+(delete|poweroff)\b|\bddev\s+snapshot\s+restore\b|\bddev\s+import-db\b/, 'replaces or removes the DDEV database or project'],
  [/\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b/, 'removes files recursively (rm -rf)'],
  [/\bfind\b[^|]*\s-delete\b/, 'deletes files found by find'],
  [/\bgit\s+(clean\s+-[a-zA-Z]*f|stash\s+drop|branch\s+-D)\b/, 'discards git work'],
  [/\bconfig:import\b|\bcim\b/, 'overwrites active configuration with config/default'],
]

export const register: Register = on => {
  on('tool.check', { tool: 'Bash' }, async ($, e, next) => {
    const command = String((e.input as { command?: unknown }).command ?? '')
    const hit = DESTRUCTIVE.find(([pattern]) => pattern.test(command))
    const verdict = await next(e)

    // Only tighten: a deny from the rules stays a deny.
    if (hit === undefined || verdict.decision === 'deny') {
      return verdict
    }
    return { decision: 'ask', reason: `drupal-guard: this command ${hit[1]}.` }
  }).catch(($, e, next) => next(e))
}
