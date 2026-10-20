# drupal-mods

Claude Code mods para proyectos Drupal que usan DDEV.

## Plugins

### drupal-guard
Pide confirmación antes de comandos que destruyen datos o código que git no puede recuperar:
reinstalar el sitio, vaciar tablas, borrar entidades en bloque, `rm -rf`, `ddev delete`,
restaurar un snapshot, o descartar cambios de git. Una regla `deny` existente se respeta igual.

### drupal-phpcs
Tras editar o crear un fichero de un módulo custom (`.php`, `.module`, `.install`, `.inc`,
`.theme`, `.profile`), ejecuta `phpcs` (estándares Drupal y DrupalPractice) dentro de DDEV sobre
ese fichero y añade el informe al contexto para que Claude lo corrija en el mismo turno.

Por defecto busca los módulos en `web/modules/custom/`. Si el proyecto usa otra raíz
(p. ej. `docroot/`), fija la variable de entorno `DRUPAL_WEBROOT`:

```bash
claude mcp add ... # no aplica aquí; para plugins usa:
claude plugin install drupal-phpcs --marketplace o0Charly0o/drupal-mods -s user -e DRUPAL_WEBROOT=docroot
```

Si DDEV no está levantado o `phpcs` no existe, el hook nunca bloquea la edición.

### ddev-status
Barra de estado: rama de git y cambios pendientes, si el contenedor web de DDEV está arriba,
y el progreso (`hecho/total`) de cada change activo en `openspec/changes/`.

## Instalar

```bash
claude plugin install drupal-guard --marketplace o0Charly0o/drupal-mods -s user
claude plugin install drupal-phpcs --marketplace o0Charly0o/drupal-mods -s user
claude plugin install ddev-status --marketplace o0Charly0o/drupal-mods -s user
```

Con `-s user` quedan disponibles en todos los proyectos; fuera de un proyecto Drupal/DDEV
simplemente no se activan.

## License

MIT
