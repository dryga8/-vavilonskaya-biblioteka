# Вавилонская библиотека

Онлайн-читалка словарей в стиле Борхеса. Поддерживает формат DSL (ABBYY Lingvo), полнотекстовый поиск через SQLite FTS5, нечёткие подсказки.

## Стек

- Next.js 14 (App Router) · TypeScript · Tailwind CSS
- SQLite + FTS5 через `better-sqlite3`

## Локальный запуск

```bash
npm install
npm run dev
```

База данных ожидается в `./data/dictionary.db`. Путь переопределяется переменной окружения `DB_PATH`.

## Деплой (Railway)

Смонтируйте volume на `/app/data`, загрузите `dictionary.db` и задайте:

```
DB_PATH=/app/data/dictionary.db
```
