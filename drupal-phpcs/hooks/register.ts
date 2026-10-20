import type { EngineInterface, Register, ToolCallResult } from 'claude-code'

const DEFAULT_WEBROOT = 'web'
const CHECKED = /\.(php|module|install|inc|theme|profile)$/

/**
 * After Claude edits or writes a PHP file of a custom module, runs phpcs
 * (Drupal, DrupalPractice) inside DDEV on that file. Problems are added to
 * what Claude reads after the edit, so it fixes them in the same turn.
 *
 * The webroot defaults to `web/`; set DRUPAL_WEBROOT (e.g. `docroot`) if the
 * project uses a different one.
 */
export const register: Register = on => {
  on('tool.call', { tool: 'Edit' }, async ($, e, next) => check($, e.file_path, await next(e)))
    .catch(($, e, next) => next(e))
  on('tool.call', { tool: 'Write' }, async ($, e, next) => check($, e.file_path, await next(e)))
    .catch(($, e, next) => next(e))
}

/**
 * Runs phpcs on an edited file and adds its report to the result.
 */
async function check<R extends ToolCallResult>($: EngineInterface, path: string, ran: R): Promise<R> {
  const webroot = (await $.env.get('DRUPAL_WEBROOT')) || DEFAULT_WEBROOT
  const custom = `${webroot}/modules/custom/`
  const at = path.indexOf(custom)
  if (ran.deny !== undefined || ran.isError === true || at < 0 || !CHECKED.test(path)) {
    return ran
  }

  const root = path.slice(0, at)
  const relative = path.slice(at)
  try {
    const { exitCode, stdout } = await $.process.run(
      ['ddev', 'exec', 'vendor/bin/phpcs', '--standard=Drupal,DrupalPractice', '--report=emacs', relative],
      { cwd: root, timeoutMs: 60000 },
    )
    if (exitCode === 0) {
      $.ui.status('phpcs ✓')
      return ran
    }
    const report = stdout.trim().split('\n').slice(0, 30).join('\n')
    $.ui.status(`phpcs ✗ ${relative.split('/').pop() ?? relative}`)
    return {
      ...ran,
      context: [...(ran.context ?? []), `phpcs (Drupal, DrupalPractice) found problems in ${relative}; fix them:\n${report}`],
    }
  }
  catch {
    // DDEV stopped or phpcs missing: never block the edit.
    return ran
  }
}
