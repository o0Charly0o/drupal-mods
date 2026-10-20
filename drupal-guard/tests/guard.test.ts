import { expect, test } from 'claude-code/testing'

for (const command of [
  'ddev drush site:install --existing-config -y',
  'ddev drush entity:delete node -y',
  'ddev exec "rm -rf web/modules/custom/my_module/scripts"',
  'ddev drush sqlq "TRUNCATE cache_default"',
  'ddev snapshot restore pre-release',
]) {
  test(`asks before: ${command}`, async ($, on) => {
    on('tool.check', () => ({ decision: 'allow' }))
    const verdict = await $.tool.check({ tool: 'Bash', input: { command } })
    expect(verdict.decision).toBe('ask')
  })
}

test('lets harmless commands through', async ($, on) => {
  on('tool.check', () => ({ decision: 'allow' }))
  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'ddev drush cst' } })
  expect(verdict.decision).toBe('allow')
})

test('keeps a deny from the rules', async ($, on) => {
  on('tool.check', () => ({ decision: 'deny', reason: 'rule' }))
  const verdict = await $.tool.check({ tool: 'Bash', input: { command: 'ddev drush si -y' } })
  expect(verdict.decision).toBe('deny')
})
