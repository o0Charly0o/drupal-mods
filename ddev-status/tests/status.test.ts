import { expect, test } from 'claude-code/testing'

const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '' } })

test('shows branch, pending changes, DDEV and OpenSpec progress', async ($, on) => {
  on('session.root', () => ({ value: '/project' }))
  on('process.run', (_$, e) => {
    const command = e.argv.join(' ')
    if (command.startsWith('git rev-parse')) return ok('master\n')
    if (command.startsWith('git status')) return ok(' M a.php\n?? b.php\n')
    if (command.startsWith('docker ps')) return ok('Up 2 hours (healthy)\n')
    return { value: { exitCode: 1, stdout: '', stderr: '' } }
  })
  on('fs.read', (_$, e) => {
    const path = String(e.path)
    if (path.endsWith('.ddev/config.yaml')) return { value: 'name: my-site\ntype: drupal11\n' }
    if (path.includes('my-feature')) return { value: '- [x] 1.1 a\n- [ ] 1.2 b\n- [x] 1.3 c\n' }
    return { deny: 'missing' }
  })
  const listed: string[] = []
  on('fs.list', (_$, e) => {
    listed.push(String(e.path))
    return {
      value: [
        { name: 'archive', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
        { name: 'my-feature', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      ],
    }
  })
  const shown: unknown[] = []
  on('ui.status', (_$, e, next) => {
    shown.push(e)
    return next(e)
  })
  on('turn.complete', () => ({ text: '' }))

  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  for (let i = 0; i < 5000 && shown.length === 0; i++) {
    await Promise.resolve()
  }

  // Read from the project root, wherever the shell went.
  expect(listed).toEqual(['/project/openspec/changes'])
  expect(JSON.stringify(shown.at(-1))).toContain('master ●2 · DDEV ✓ · my-feature 2/3')
})
