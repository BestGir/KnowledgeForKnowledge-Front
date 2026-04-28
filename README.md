# KnowledgeForKnowledge Frontend

React + TypeScript + Vite клиент для backend-проекта `KnowledgeForKnowledge`.

## Что уже есть

- авторизация, регистрация, OTP и сброс пароля
- каталог навыков, предложений и запросов
- отправка откликов на карточки
- личный кабинет с профилем, навыками, уведомлениями и матчами
- публичная страница пользователя

## Запуск

1. Установи зависимости:

```bash
npm install
```

2. При необходимости создай `.env` на основе `.env.example`.

3. Для разработки:

```bash
npm run dev
```

4. Для production-сборки:

```bash
npm run build
```

## API

По умолчанию dev-сервер проксирует запросы `/api` и `/uploads` на `http://localhost:5000`.

Если backend запущен на другом адресе, задай:

```bash
VITE_API_BASE_URL=http://localhost:8080/api
```
