# Как залить CloudWorld на GitHub (если папки не перетаскиваются)

Сайт GitHub **не сохраняет папки** при Upload files — поэтому `src/` и `public/` пропадают. Нужен Git.

## Способ 1 — скрипт (Windows)

1. На https://github.com/ivanzolow833-droid/nit-forums ничего вручную заливать не нужно (скрипт перезапишет).
2. Установи [Git for Windows](https://git-scm.com/download/win), если ещё нет.
3. Скачай и распакуй архив форума.
4. Запусти **`push-to-github.bat`** двойным кликом.
5. Если откроется браузер — войди в GitHub.
6. Обнови страницу репозитория: должны появиться папки `src` и `public`.

## Способ 2 — GitHub Desktop

1. Установи [GitHub Desktop](https://desktop.github.com/).
2. File → Clone repository → `ivanzolow833-droid/nit-forums`.
3. Скопируй **все** файлы из распакованного архива в папку клона (с заменой).
4. Commit → Push origin.

После этого в Vercel: Import → `nit-forums` → Deploy.
