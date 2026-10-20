import { expect, test } from 'claude-code/testing'

const edit = (file_path: string) => ({
  tool: 'Edit' as const,
  file_path,
  old_string: 'a',
  new_string: 'b',
})

test('adds the phpcs report after editing a custom module file', async ($, on) => {
  const commands: string[][] = []
  on('env.get', () => ({ value: undefined }))
  on('process.run', (_$, e) => {
    commands.push([...e.argv])
    return { value: { exitCode: 2, stdout: 'web/modules/custom/m/src/A.php:3:1: error - Missing doc comment', stderr: '' } }
  })
  on('tool.call', () => ({ result: { filePath: 'x' } }))

  const ran = await $.tool.call(edit('/home/me/project/web/modules/custom/m/src/A.php'))

  expect(commands[0]).toEqual(['ddev', 'exec', 'vendor/bin/phpcs', '--standard=Drupal,DrupalPractice', '--report=emacs', 'web/modules/custom/m/src/A.php'])
  expect('context' in ran && (ran.context ?? []).join('\n')).toContain('Missing doc comment')
})

test('stays quiet when phpcs passes', async ($, on) => {
  on('env.get', () => ({ value: undefined }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '' } }))
  on('tool.call', () => ({ result: { filePath: 'x' } }))

  const ran = await $.tool.call(edit('/home/me/project/web/modules/custom/m/m.module'))

  expect('context' in ran ? ran.context ?? [] : []).toEqual([])
})

test('ignores files outside custom modules', async ($, on) => {
  const commands: string[][] = []
  on('env.get', () => ({ value: undefined }))
  on('process.run', (_$, e) => {
    commands.push([...e.argv])
    return { value: { exitCode: 2, stdout: 'x', stderr: '' } }
  })
  on('tool.call', () => ({ result: { filePath: 'x' } }))

  await $.tool.call(edit('/home/me/project/config/default/system.site.yml'))
  await $.tool.call(edit('/home/me/project/web/modules/contrib/x/x.module'))

  expect(commands).toEqual([])
})

test('honors DRUPAL_WEBROOT when set', async ($, on) => {
  const commands: string[][] = []
  on('env.get', (_$, e) => ({ value: e.name === 'DRUPAL_WEBROOT' ? 'docroot' : undefined }))
  on('process.run', (_$, e) => {
    commands.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })
  on('tool.call', () => ({ result: { filePath: 'x' } }))

  await $.tool.call(edit('/home/me/project/docroot/modules/custom/m/m.module'))
  await $.tool.call(edit('/home/me/project/web/modules/custom/m/m.module'))

  expect(commands).toEqual([
    ['ddev', 'exec', 'vendor/bin/phpcs', '--standard=Drupal,DrupalPractice', '--report=emacs', 'docroot/modules/custom/m/m.module'],
  ])
})
