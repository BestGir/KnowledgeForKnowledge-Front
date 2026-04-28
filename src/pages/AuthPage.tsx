import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';
import { Notice, Surface } from '../components/Ui';
import { ApiError, forgotPassword, login, registerAccount, resetPassword, verifyOtp } from '../lib/api';
import { parseTelegramInput } from '../lib/telegram';

type AuthMode = 'login' | 'recovery' | 'register';
type NoticeState = { message: string; tone: 'danger' | 'info' | 'success' } | null;
type PendingTelegramLink = { token: string; url: string } | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const telegramBotUsername = 'KnowledgeForKnowledge_bot';

function validateEmail(email: string) {
  return emailPattern.test(email.trim());
}

function buildTelegramBotLink(token: string) {
  return `https://t.me/${telegramBotUsername}?start=${encodeURIComponent(token)}`;
}

function getPasswordValidationMessages(password: string) {
  const messages: string[] = [];

  if (password.length < 8) {
    messages.push('Пароль должен быть не короче 8 символов.');
  }

  if (!/[A-Z]/.test(password)) {
    messages.push('В пароле нужна хотя бы одна заглавная буква.');
  }

  if (!/[0-9]/.test(password)) {
    messages.push('В пароле нужна хотя бы одна цифра.');
  }

  return messages;
}

function dedupeMessages(messages: string[]) {
  return [...new Set(messages.filter(Boolean))];
}

function extractApiMessages(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const detailedMessages = error.errors ? Object.values(error.errors).flat() : [];
    return dedupeMessages(detailedMessages.length > 0 ? detailedMessages : [error.message]);
  }

  if (error instanceof Error && error.message) {
    return [error.message];
  }

  return [fallback];
}

function getTelegramHint(value: string) {
  const parsedValue = parseTelegramInput(value);

  if (parsedValue.kind === 'username') {
    return `Распознал ${parsedValue.displayValue}. После регистрации покажем ссылку на бота: нажми Start, и сайт сможет отправить код.`;
  }

  if (parsedValue.kind === 'chat-id') {
    return `Распознал chat ID: ${parsedValue.displayValue}. Код можно отправить сразу после создания аккаунта.`;
  }

  if (parsedValue.kind === 'invalid') {
    return 'Можно указать https://t.me/username, t.me/username, @username, username или числовой chat ID.';
  }

  return null;
}

export function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, setSession } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

  const [loginForm, setLoginForm] = useState({
    login: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    confirmPassword: '',
    login: '',
    password: '',
    telegramId: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [pendingTelegramLink, setPendingTelegramLink] = useState<PendingTelegramLink>(null);

  const [recoveryForm, setRecoveryForm] = useState({
    code: '',
    confirmPassword: '',
    login: '',
    newPassword: '',
  });
  const [recoverySessionId, setRecoverySessionId] = useState<string | null>(null);

  const registerTelegramHint = getTelegramHint(registerForm.telegramId);
  const waitingForOtp = mode === 'login' && Boolean(otpSessionId);

  function resetMessages() {
    setNotice(null);
    setValidationMessages([]);
  }

  function showValidationFeedback(messages: string[], fallbackSummary = 'Исправь ошибки в форме и попробуй снова.') {
    const uniqueMessages = dedupeMessages(messages);
    setValidationMessages(uniqueMessages.length > 1 ? uniqueMessages : []);
    setNotice({
      message: uniqueMessages.length > 1 ? fallbackSummary : uniqueMessages[0] ?? fallbackSummary,
      tone: 'danger',
    });
  }

  function showApiFailure(error: unknown, fallbackMessage: string) {
    const messages = extractApiMessages(error, fallbackMessage);
    showValidationFeedback(messages, 'Проверь введенные данные и попробуй снова.');
  }

  async function finishLogin(nextSession: { accountId: string; isAdmin: boolean; token: string }) {
    setPendingTelegramLink(null);
    setSession(nextSession);
    navigate('/dashboard');
  }

  function showTelegramLink(token: string, message: string, tone: 'info' | 'success' = 'info') {
    setOtpSessionId(null);
    setPendingTelegramLink({
      token,
      url: buildTelegramBotLink(token),
    });
    setNotice({ message, tone });
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    const clientMessages: string[] = [];

    if (!validateEmail(loginForm.login)) {
      clientMessages.push('Для входа укажи email.');
    }

    if (!loginForm.password.trim()) {
      clientMessages.push('Введи пароль.');
    }

    if (clientMessages.length > 0) {
      showValidationFeedback(clientMessages);
      return;
    }

    setBusy(true);

    try {
      const result = await login(loginForm);

      if (result.requiresTelegramLink && result.telegramLinkToken) {
        showTelegramLink(
          result.telegramLinkToken,
          'Для входа нужно привязать Telegram. Открой бота по ссылке, нажми Start и затем запроси код.',
        );
        return;
      }

      if (result.requiresOtp && result.sessionId) {
        setOtpCode('');
        setOtpSessionId(result.sessionId);
        setNotice({
          message: 'Код отправлен в Telegram. Введи его ниже, чтобы завершить вход.',
          tone: 'info',
        });
        return;
      }

      if (!result.token) {
        showValidationFeedback(['Вход без Telegram-кода запрещен. Сначала привяжи Telegram и подтверди OTP.']);
        return;
      }

      await finishLogin(result);
    } catch (error) {
      showApiFailure(error, 'Не удалось выполнить вход.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTelegramLinkOtpRequest() {
    if (!pendingTelegramLink) {
      return;
    }

    resetMessages();
    setBusy(true);

    try {
      const result = await login({
        login: loginForm.login.trim(),
        password: loginForm.password,
        requireTelegramOtp: true,
      });

      if (result.requiresTelegramLink && result.telegramLinkToken) {
        showTelegramLink(
          result.telegramLinkToken,
          'Telegram еще не привязан. Открой бота, нажми Start и запроси код снова.',
        );
        return;
      }

      if (result.requiresOtp && result.sessionId) {
        setPendingTelegramLink(null);
        setOtpCode('');
        setOtpSessionId(result.sessionId);
        setNotice({
          message: 'Отлично, Telegram привязан. Код отправлен в бот, введи его ниже.',
          tone: 'success',
        });
        return;
      }

      showValidationFeedback(['Вход без Telegram-кода запрещен. Сначала привяжи Telegram и подтверди OTP.']);
    } catch (error) {
      showApiFailure(error, 'Telegram еще не привязан. Открой бота по ссылке, нажми Start и запроси код снова.');
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!otpSessionId) {
      return;
    }

    resetMessages();
    setBusy(true);

    try {
      const result = await verifyOtp({
        code: otpCode,
        sessionId: otpSessionId,
      });
      await finishLogin(result);
    } catch (error) {
      showApiFailure(error, 'Не удалось проверить код из Telegram.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    const clientMessages: string[] = [];
    const parsedTelegram = parseTelegramInput(registerForm.telegramId);

    if (!validateEmail(registerForm.login)) {
      clientMessages.push('Для регистрации нужен email.');
    }

    clientMessages.push(...getPasswordValidationMessages(registerForm.password));

    if (registerForm.password !== registerForm.confirmPassword) {
      clientMessages.push('Пароли не совпадают.');
    }

    if (registerForm.telegramId.trim() && parsedTelegram.kind === 'invalid') {
      clientMessages.push('Telegram можно указать как ссылку, @ник, ник или числовой chat ID.');
    }

    if (clientMessages.length > 0) {
      showValidationFeedback(clientMessages);
      return;
    }

    const normalizedLogin = registerForm.login.trim();
    const shouldCreateTelegramLink = parsedTelegram.kind === 'username';
    const shouldRequireOtpImmediately = parsedTelegram.kind === 'chat-id';

    setBusy(true);

    try {
      const registerResult = await registerAccount({
        createTelegramLinkToken: shouldCreateTelegramLink,
        login: normalizedLogin,
        password: registerForm.password,
        telegramId: parsedTelegram.kind === 'chat-id' ? parsedTelegram.normalized : undefined,
      });

      setLoginForm({
        login: normalizedLogin,
        password: registerForm.password,
      });

      if (shouldCreateTelegramLink && registerResult.telegramLinkToken) {
        setMode('login');
        showTelegramLink(
          registerResult.telegramLinkToken,
          'Аккаунт создан. Теперь нужно один раз открыть бота и нажать Start, чтобы Telegram смог прислать код.',
          'success',
        );
        return;
      }

      const loginResult = await login({
        login: normalizedLogin,
        password: registerForm.password,
        requireTelegramOtp: shouldRequireOtpImmediately,
      });

      if (loginResult.requiresTelegramLink && loginResult.telegramLinkToken) {
        setMode('login');
        showTelegramLink(
          loginResult.telegramLinkToken,
          'Аккаунт создан. Без Telegram-кода вход запрещен, поэтому сначала привяжи бота.',
          'success',
        );
        return;
      }

      if (loginResult.requiresOtp && loginResult.sessionId) {
        setMode('login');
        setOtpSessionId(loginResult.sessionId);
        setNotice({
          message: 'Аккаунт создан. Код отправлен в Telegram, введи его ниже.',
          tone: 'success',
        });
        return;
      }

      showValidationFeedback(['Вход без Telegram-кода запрещен. Сначала привяжи Telegram и подтверди OTP.']);
    } catch (error) {
      if (error instanceof ApiError && error.message.toLowerCase().includes('уже существует')) {
        showValidationFeedback(['Этот email уже зарегистрирован. Используй вкладку "Вход" или "Восстановление".']);
        return;
      }

      showApiFailure(error, 'Не удалось зарегистрировать аккаунт.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRecoveryRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!validateEmail(recoveryForm.login)) {
      showValidationFeedback(['Для восстановления доступа укажи email.']);
      return;
    }

    setBusy(true);

    try {
      const result = await forgotPassword(recoveryForm.login.trim());
      setRecoverySessionId(result.sessionId);
      setNotice({
        message: 'Если Telegram привязан, код для сброса уже отправлен. Введи его ниже.',
        tone: 'success',
      });
    } catch (error) {
      showApiFailure(error, 'Не удалось запросить сброс пароля.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRecoveryReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recoverySessionId) {
      return;
    }

    resetMessages();

    const clientMessages = getPasswordValidationMessages(recoveryForm.newPassword);

    if (recoveryForm.newPassword !== recoveryForm.confirmPassword) {
      clientMessages.push('Новый пароль и повтор пароля не совпадают.');
    }

    if (clientMessages.length > 0) {
      showValidationFeedback(clientMessages);
      return;
    }

    setBusy(true);

    try {
      await resetPassword({
        code: recoveryForm.code,
        newPassword: recoveryForm.newPassword,
        sessionId: recoverySessionId,
      });

      setMode('login');
      setRecoverySessionId(null);
      setOtpSessionId(null);
      setLoginForm({
        login: recoveryForm.login.trim(),
        password: '',
      });
      setRecoveryForm({
        code: '',
        confirmPassword: '',
        login: recoveryForm.login,
        newPassword: '',
      });
      setNotice({
        message: 'Пароль обновлен. Теперь можно войти с новым паролем.',
        tone: 'success',
      });
    } catch (error) {
      showApiFailure(error, 'Не удалось обновить пароль.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack page-stack--two-column">
      <Surface className="auth-copy">
        <p className="eyebrow">Авторизация</p>
        <h1>Вход в систему обмена знаниями</h1>
        <p className="hero-text">
          Для входа используется email и пароль. Если Telegram привязан, сайт отправляет одноразовый код в бота и
          просит подтвердить вход.
        </p>
        <div className="feature-list">
          <div>
            <strong>Регистрация по email</strong>
            <p>Логин проверяется как email, чтобы потом не было путаницы с восстановлением доступа.</p>
          </div>
          <div>
            <strong>Проверка пароля</strong>
            <p>Нужны минимум 8 символов, одна заглавная буква и одна цифра.</p>
          </div>
          <div>
            <strong>Telegram в разных форматах</strong>
            <p>Можно вставить t.me-ссылку, @ник, обычный ник или числовой chat ID.</p>
          </div>
        </div>
        <div className="detail-panel">
          <span className="eyebrow">Telegram bot</span>
          <strong>@{telegramBotUsername}</strong>
          <p>Если не открыть диалог и не нажать Start, бот не сможет написать первым.</p>
          <a className="text-link" href={`https://t.me/${telegramBotUsername}`} rel="noreferrer" target="_blank">
            Открыть бота
          </a>
        </div>
        {isAuthenticated ? <Notice message="Сессия уже активна. Можно сразу перейти в кабинет." tone="success" /> : null}
        <Link className="text-link" to="/explore">
          Посмотреть каталог без авторизации
        </Link>
      </Surface>

      <Surface className="auth-card">
        <div className="tab-row">
          <button
            className={mode === 'login' ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => {
              setMode('login');
              resetMessages();
            }}
            type="button"
          >
            Вход
          </button>
          <button
            className={mode === 'register' ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => {
              setMode('register');
              setPendingTelegramLink(null);
              resetMessages();
            }}
            type="button"
          >
            Регистрация
          </button>
          <button
            className={mode === 'recovery' ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => {
              setMode('recovery');
              setPendingTelegramLink(null);
              resetMessages();
            }}
            type="button"
          >
            Восстановление
          </button>
        </div>

        {notice ? <Notice message={notice.message} tone={notice.tone} /> : null}

        {validationMessages.length > 1 ? (
          <div className="form-help">
            <strong>Что исправить</strong>
            <ul className="field-errors">
              {validationMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {pendingTelegramLink ? (
          <div className="form-help">
            <strong>Привязка Telegram</strong>
            <p>
              Открой бота по персональной ссылке, нажми Start, затем вернись сюда и запроси код. Это нужно один раз,
              чтобы бот узнал твой chat ID.
            </p>
            <div className="telegram-command">
              <span>Если Telegram открылся без токена, отправь боту команду вручную:</span>
              <code>/start {pendingTelegramLink.token}</code>
            </div>
            <div className="button-row">
              <a className="button button--ghost" href={pendingTelegramLink.url} rel="noreferrer" target="_blank">
                Открыть бота
              </a>
              <button className="button button--primary" disabled={busy} onClick={handleTelegramLinkOtpRequest} type="button">
                {busy ? 'Запрашиваем код...' : 'Я нажал Start, запросить код'}
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'login' ? (
          <form className="form-grid" onSubmit={waitingForOtp ? handleOtpSubmit : handleLoginSubmit}>
            <label>
              <span>Email</span>
              <input
                disabled={waitingForOtp}
                onChange={(event) => setLoginForm((current) => ({ ...current, login: event.target.value }))}
                placeholder="student@example.com"
                type="email"
                value={loginForm.login}
              />
              <small className="field-hint">Используй тот же email, который вводил при регистрации.</small>
            </label>
            <label>
              <span>Пароль</span>
              <input
                disabled={waitingForOtp}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Введите пароль"
                type="password"
                value={loginForm.password}
              />
            </label>
            {waitingForOtp ? (
              <label>
                <span>Код из Telegram</span>
                <input onChange={(event) => setOtpCode(event.target.value)} placeholder="123456" value={otpCode} />
              </label>
            ) : null}
            <button className="button button--primary" disabled={busy} type="submit">
              {waitingForOtp ? (busy ? 'Проверяем...' : 'Подтвердить код') : busy ? 'Входим...' : 'Войти'}
            </button>
          </form>
        ) : null}

        {mode === 'register' ? (
          <form className="form-grid" onSubmit={handleRegisterSubmit}>
            <label>
              <span>Email</span>
              <input
                onChange={(event) => setRegisterForm((current) => ({ ...current, login: event.target.value }))}
                placeholder="new-member@example.com"
                type="email"
                value={registerForm.login}
              />
              <small className="field-hint">Email будет использоваться для входа.</small>
            </label>
            <label>
              <span>Пароль</span>
              <input
                onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Например: StudyPass1"
                type="password"
                value={registerForm.password}
              />
              <small className="field-hint">Минимум 8 символов, 1 заглавная буква и 1 цифра.</small>
            </label>
            <label>
              <span>Повтор пароля</span>
              <input
                onChange={(event) => setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                placeholder="Повтори пароль"
                type="password"
                value={registerForm.confirmPassword}
              />
            </label>
            <label>
              <span>Telegram для кода</span>
              <input
                onChange={(event) => setRegisterForm((current) => ({ ...current, telegramId: event.target.value }))}
                placeholder="https://t.me/username, @username или 123456789"
                value={registerForm.telegramId}
              />
              {registerTelegramHint ? <small className="field-hint">{registerTelegramHint}</small> : null}
              <small className="field-hint">
                Бот: <a className="text-link" href={`https://t.me/${telegramBotUsername}`} rel="noreferrer" target="_blank">@{telegramBotUsername}</a>
              </small>
            </label>
            <button className="button button--primary" disabled={busy} type="submit">
              {busy ? 'Создаем...' : 'Создать аккаунт'}
            </button>
          </form>
        ) : null}

        {mode === 'recovery' ? (
          <div className="form-grid">
            <form className="form-grid" onSubmit={handleRecoveryRequest}>
              <label>
                <span>Email аккаунта</span>
                <input
                  onChange={(event) => setRecoveryForm((current) => ({ ...current, login: event.target.value }))}
                  placeholder="student@example.com"
                  type="email"
                  value={recoveryForm.login}
                />
              </label>
              <button className="button button--ghost" disabled={busy} type="submit">
                {busy ? 'Запрашиваем...' : 'Запросить код'}
              </button>
            </form>

            {recoverySessionId ? (
              <form className="form-grid" onSubmit={handleRecoveryReset}>
                <label>
                  <span>Код подтверждения</span>
                  <input
                    onChange={(event) => setRecoveryForm((current) => ({ ...current, code: event.target.value }))}
                    placeholder="123456"
                    value={recoveryForm.code}
                  />
                </label>
                <label>
                  <span>Новый пароль</span>
                  <input
                    onChange={(event) => setRecoveryForm((current) => ({ ...current, newPassword: event.target.value }))}
                    placeholder="Например: StudyPass1"
                    type="password"
                    value={recoveryForm.newPassword}
                  />
                  <small className="field-hint">Те же правила: 8+ символов, заглавная буква и цифра.</small>
                </label>
                <label>
                  <span>Повтор нового пароля</span>
                  <input
                    onChange={(event) => setRecoveryForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    placeholder="Повтори новый пароль"
                    type="password"
                    value={recoveryForm.confirmPassword}
                  />
                </label>
                <button className="button button--primary" disabled={busy} type="submit">
                  {busy ? 'Обновляем...' : 'Сменить пароль'}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </Surface>
    </div>
  );
}
