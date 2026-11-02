// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { SupportChat } from '../src/components/SupportChat';
import { SUPPORT_CHAT_LABELS_EN, SUPPORT_CHAT_LABELS_FR } from '../src/components/supportChatLabels';
import { SupportError } from '../src/errors';
import type { SupportClientLike, SupportMessage, SupportOffer } from '../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const OFFER: SupportOffer = {
  requester: { username: 'hds-support', host: 'datasafe.dev' },
  displayName: 'Health Data Safe team',
  consent: { en: 'Invite DPO text EN', fr: 'Texte DPO FR' },
  permissions: [{ streamId: 'hds-support', level: 'read', defaultName: 'HDS support' }],
  features: { chat: true, systemMessaging: true },
  accessType: 'shared'
};

const THREAD: SupportMessage[] = [
  { id: 'm1', time: 10, mine: true, author: null, text: 'Hello, I need help' },
  { id: 'm2', time: 20, mine: false, author: 'Alice', text: 'Hi, how can I help?' },
  { id: 'm3', time: 30, mine: false, author: null, text: 'Welcome to HDS support.' }
];

function fakeClient (over: Partial<Record<keyof SupportClientLike, any>> = {}) {
  let listener: ((m: SupportMessage) => void) | null = null;
  const client = {
    loadConfig: vi.fn(async () => ({})),
    status: vi.fn(async () => 'joined'),
    prepareJoin: vi.fn(async () => OFFER),
    join: vi.fn(async () => 'joined'),
    thread: vi.fn(async () => THREAD),
    onMessage: vi.fn((cb: (m: SupportMessage) => void) => { listener = cb; return () => { listener = null; }; }),
    send: vi.fn(async (text: string) => ({ id: 'new', time: 99, mine: true, author: null, text })),
    presence: vi.fn(async () => ({ online: true, agents: 1 })),
    notifyMe: vi.fn(async () => {}),
    ...over,
    push: (m: SupportMessage) => listener?.(m)
  };
  return client;
}

let root: Root | null = null;
let container: HTMLElement | null = null;

async function flush (): Promise<void> {
  for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); });
}

async function mount (node: React.ReactNode): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(node); });
  await flush();
  return container;
}

afterEach(() => {
  act(() => { root?.unmount(); });
  container?.remove();
  root = null;
  container = null;
});

const q = (c: HTMLElement, id: string) => c.querySelector(`[data-testid="${id}"]`);

async function click (el: Element | null): Promise<void> {
  expect(el).not.toBeNull();
  await act(async () => { (el as HTMLElement).click(); });
  await flush();
}

async function typeInto (el: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function buttonByText (c: HTMLElement, text: string): HTMLButtonElement | null {
  return ([...c.querySelectorAll('button')] as HTMLButtonElement[]).find((b) => b.textContent === text) ?? null;
}

describe('[SCR-N] not joined', () => {
  it('[SCR-N1] shows the intro and the consent through ConsentPanel, with the chat-only notice and the DPO text', async () => {
    const client = fakeClient({ status: vi.fn(async () => 'not-joined') });
    const c = await mount(<SupportChat client={client} dpoText='DPO: the team sees your messages; kept while you stay connected.' />);
    expect(q(c, 'support-not-joined')).not.toBeNull();
    expect(c.textContent).toContain(SUPPORT_CHAT_LABELS_EN.intro);
    const panel = q(c, 'consent-panel');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain(SUPPORT_CHAT_LABELS_EN.consentTitle);
    expect(panel!.textContent).toContain('DPO: the team sees your messages');
    expect(panel!.textContent).toContain(SUPPORT_CHAT_LABELS_EN.placeholderStreamName);
    expect(q(c, 'support-chat-only')!.textContent).toBe('The HDS team can only exchange messages with you; it has no access to your health data.');
    expect(client.prepareJoin).toHaveBeenCalledTimes(1);
    expect(client.thread).not.toHaveBeenCalled();
  });

  it('[SCR-N2] without a dpoText prop, the invite consent text in the language is shown', async () => {
    const client = fakeClient({ status: vi.fn(async () => 'not-joined') });
    const c = await mount(<SupportChat client={client} lang='fr' />);
    expect(q(c, 'consent-panel')!.textContent).toContain('Texte DPO FR');
    expect(c.textContent).toContain(SUPPORT_CHAT_LABELS_FR.chatOnlyNotice);
    expect(buttonByText(c, 'Autoriser')).not.toBeNull();
  });

  it('[SCR-N3] Allow joins and switches to the thread', async () => {
    const onJoined = vi.fn();
    const client = fakeClient({ status: vi.fn(async () => 'not-joined') });
    const c = await mount(<SupportChat client={client} onJoined={onJoined} />);
    await click(buttonByText(c, 'Allow'));
    expect(client.join).toHaveBeenCalledTimes(1);
    expect(onJoined).toHaveBeenCalledTimes(1);
    expect(q(c, 'support-joined')).not.toBeNull();
    expect(client.thread).toHaveBeenCalledTimes(1);
  });

  it('[SCR-N4] Refuse calls onRefuse and offers to come back', async () => {
    const onRefuse = vi.fn();
    const client = fakeClient({ status: vi.fn(async () => 'not-joined') });
    const c = await mount(<SupportChat client={client} onRefuse={onRefuse} />);
    await click(buttonByText(c, 'Refuse'));
    expect(onRefuse).toHaveBeenCalledTimes(1);
    expect(q(c, 'support-refused')).not.toBeNull();
    expect(q(c, 'consent-panel')).toBeNull();
    expect(client.join).not.toHaveBeenCalled();
  });

  it('[SCR-N5] a failed join keeps the consent and shows the error', async () => {
    const client = fakeClient({ status: vi.fn(async () => 'not-joined'), join: vi.fn(async () => { throw new SupportError('join-failed', 'x'); }) });
    const c = await mount(<SupportChat client={client} />);
    await click(buttonByText(c, 'Allow'));
    expect(q(c, 'consent-panel')).not.toBeNull();
    expect(c.textContent).toContain(SUPPORT_CHAT_LABELS_EN.joinError);
  });
});

describe('[SCR-J] joined', () => {
  it('[SCR-J1] online: thread with bylines, online banner, medical notice, no notify form', async () => {
    const client = fakeClient();
    const c = await mount(<SupportChat client={client} />);
    expect(q(c, 'support-joined')).not.toBeNull();
    expect(q(c, 'support-presence-online')).not.toBeNull();
    expect(q(c, 'support-presence-offline')).toBeNull();
    const bylines = [...c.querySelectorAll('[data-testid="support-byline"]')].map((b) => b.textContent);
    expect(bylines).toEqual(['Alice', 'Health Data Safe team']);
    expect(q(c, 'support-thread')!.textContent).toContain('Hi, how can I help?');
    expect(q(c, 'support-medical-notice')!.textContent).toBe('Please do not share medical details here.');
    expect(q(c, 'support-notify-form')).toBeNull();
    expect(c.querySelector('input[type="file"]')).toBeNull();
  });

  it('[SCR-J2] a live line is appended; the composer sends', async () => {
    const client = fakeClient();
    const c = await mount(<SupportChat client={client} />);
    await act(async () => { client.push({ id: 'm4', time: 40, mine: false, author: 'Bob', text: 'Bob joined' }); });
    expect(q(c, 'support-thread')!.textContent).toContain('Bob joined');
    const ta = c.querySelector('textarea')!;
    await typeInto(ta, 'Thanks!');
    await click(buttonByText(c, 'Send'));
    expect(client.send).toHaveBeenCalledWith('Thanks!');
    expect(q(c, 'support-thread')!.textContent).toContain('Thanks!');
    expect(ta.value).toBe('');
  });

  it('[SCR-J3] offline: banner and the notify form, prefilled, with an explicit consent checkbox', async () => {
    const client = fakeClient({ presence: vi.fn(async () => ({ online: false, agents: 0 })) });
    const c = await mount(<SupportChat client={client} defaultEmail='alice@example.org' />);
    expect(q(c, 'support-presence-offline')!.textContent).toContain('Nobody is online right now');
    const form = q(c, 'support-notify-form') as HTMLFormElement;
    expect(form).not.toBeNull();
    const email = form.querySelector('input[type="email"]') as HTMLInputElement;
    expect(email.value).toBe('alice@example.org');
    const consent = form.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(consent.checked).toBe(false);
    const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    await click(consent);
    expect(submit.disabled).toBe(false);
    await click(submit);
    expect(client.notifyMe).toHaveBeenCalledWith('alice@example.org', { consent: true, lang: 'en' });
    expect(c.textContent).toContain(SUPPORT_CHAT_LABELS_EN.notifyDone);
  });

  it('[SCR-J3b] the widget language goes to notifyMe (the email language, v1.1)', async () => {
    const client = fakeClient({ presence: vi.fn(async () => ({ online: false, agents: 0 })) });
    const c = await mount(<SupportChat client={client} lang='fr' defaultEmail='alice@example.org' />);
    const form = q(c, 'support-notify-form') as HTMLFormElement;
    await click(form.querySelector('input[type="checkbox"]'));
    await click(form.querySelector('button[type="submit"]'));
    expect(client.notifyMe).toHaveBeenCalledWith('alice@example.org', { consent: true, lang: 'fr' });
    expect(c.textContent).toContain(SUPPORT_CHAT_LABELS_FR.notifyDone);
  });

  it('[SCR-J3c] unknown-thread (no longer joined) shows the ended-conversation message and keeps the form', async () => {
    const client = fakeClient({
      presence: vi.fn(async () => ({ online: false, agents: 0 })),
      notifyMe: vi.fn(async () => { throw new SupportError('unknown-thread', 'x', { status: 404 }); })
    });
    const c = await mount(<SupportChat client={client} defaultEmail='alice@example.org' />);
    const form = q(c, 'support-notify-form') as HTMLFormElement;
    await click(form.querySelector('input[type="checkbox"]'));
    await click(form.querySelector('button[type="submit"]'));
    expect(c.querySelector('[role="alert"]')!.textContent).toBe(SUPPORT_CHAT_LABELS_EN.notifyUnknownThread);
    expect(c.textContent).not.toContain(SUPPORT_CHAT_LABELS_EN.notifyError);
    expect(q(c, 'support-notify-form')).not.toBeNull();
  });

  it('[SCR-J4] offline before the first message: banner, no notify form yet', async () => {
    const client = fakeClient({ presence: vi.fn(async () => ({ online: false, agents: 0 })), thread: vi.fn(async () => []) });
    const c = await mount(<SupportChat client={client} />);
    expect(q(c, 'support-presence-offline')).not.toBeNull();
    expect(q(c, 'support-notify-form')).toBeNull();
  });

  it('[SCR-J5] already-sent is reported, not shown as a failure', async () => {
    const client = fakeClient({
      presence: vi.fn(async () => ({ online: false, agents: 0 })),
      notifyMe: vi.fn(async () => { throw new SupportError('already-sent', 'x', { status: 409 }); })
    });
    const c = await mount(<SupportChat client={client} defaultEmail='alice@example.org' />);
    const form = q(c, 'support-notify-form') as HTMLFormElement;
    await click(form.querySelector('input[type="checkbox"]'));
    await click(form.querySelector('button[type="submit"]'));
    expect(c.textContent).toContain(SUPPORT_CHAT_LABELS_EN.notifyAlreadySent);
  });

  it('[SCR-J6] presence failure is shown as offline', async () => {
    const client = fakeClient({ presence: vi.fn(async () => { throw new SupportError('network-error', 'down'); }) });
    const c = await mount(<SupportChat client={client} />);
    expect(q(c, 'support-presence-offline')).not.toBeNull();
  });

  it('[SCR-J7] unmount unsubscribes the live feed', async () => {
    const off = vi.fn();
    const client = fakeClient({ onMessage: vi.fn(() => off) });
    await mount(<SupportChat client={client} />);
    act(() => { root?.unmount(); });
    root = null;
    expect(off).toHaveBeenCalledTimes(1);
  });
});

describe('[SCR-E] errors', () => {
  it('[SCR-E1] a failed status shows retry, which re-runs it', async () => {
    const status = vi.fn().mockRejectedValueOnce(new SupportError('network-error', 'down')).mockResolvedValue('joined');
    const client = fakeClient({ status });
    const c = await mount(<SupportChat client={client} />);
    expect(q(c, 'support-error')).not.toBeNull();
    await click(buttonByText(c, 'Try again'));
    expect(q(c, 'support-joined')).not.toBeNull();
  });
});
