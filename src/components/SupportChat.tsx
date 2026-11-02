import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { ConsentPanel } from 'hds-forms-js';
import { isSupportError } from '../errors';
import { MAX_MESSAGE_LENGTH } from '../messages';
import type { SupportClientLike, SupportMessage, SupportOffer, SupportPresence } from '../types';
import { supportChatLabels } from './supportChatLabels';
import type { SupportChatLabels } from './supportChatLabels';

export interface SupportChatProps {
  /** A `SupportClient` built by the host with its connection, service URL and scope. */
  client: SupportClientLike;
  /** Picks the default label set (`'fr'` or `'en'`, default English). */
  lang?: string;
  /** Overrides of the default labels (`consent` overrides the embedded ConsentPanel's). */
  labels?: Partial<Omit<SupportChatLabels, 'consent'>> & { consent?: SupportChatLabels['consent'] };
  /**
   * DPO notice shown in the consent panel (plan 117 criterion 8). Defaults to the invite's own consent text in
   * `lang` (or English). A node renders as given; this text is never injected as HTML.
   */
  dpoText?: ReactNode;
  /** Prefills the notify-me address (e.g. the account e-mail, when the host can read it). */
  defaultEmail?: string;
  /** Presence refresh period while the conversation is open (default 60 s, SERVICE-API.md). */
  presencePollMs?: number;
  /** Called once the user joined. */
  onJoined?: () => void;
  /** Called when the user refuses the consent (the host may close the view). */
  onRefuse?: () => void;
  className?: string;
}

type Phase = 'loading' | 'error' | 'not-joined' | 'joined';
type NotifyState = 'idle' | 'sending' | 'done' | 'already-sent';

function mergeMessages (current: SupportMessage[], incoming: SupportMessage[]): SupportMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.time - b.time);
}

function timeOf (seconds: number, lang: string): string {
  try {
    return new Date(seconds * 1000).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return '';
  }
}

const BUTTON_PRIMARY = 'inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON_SECONDARY = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800';

/**
 * The "Help & support" conversation with the Health Data Safe team (plan 117, A7): consent to join, then the
 * thread, the composer and, when nobody is online, the notify-me form. Theme-agnostic (stock Tailwind plus the
 * `primary` scale of hds-style / hds-forms-js tokens), mobile-first.
 */
export function SupportChat ({
  client, lang = 'en', labels, dpoText, defaultEmail = '', presencePollMs = 60_000, onJoined, onRefuse, className = ''
}: SupportChatProps) {
  const lb: SupportChatLabels = useMemo(() => {
    const base = supportChatLabels(lang);
    return { ...base, ...labels, consent: { ...base.consent, ...labels?.consent } };
  }, [lang, labels]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [offer, setOffer] = useState<SupportOffer | null>(null);
  const [offerFailed, setOfferFailed] = useState(false);
  const [refused, setRefused] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinFailed, setJoinFailed] = useState(false);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [presence, setPresence] = useState<SupportPresence | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const [email, setEmail] = useState(defaultEmail);
  const [emailConsent, setEmailConsent] = useState(false);
  const [notifyState, setNotifyState] = useState<NotifyState>('idle');
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const threadEnd = useRef<HTMLLIElement | null>(null);

  // Status, then the offer when not joined.
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    (async () => {
      try {
        const s = await client.status();
        if (cancelled) return;
        if (s === 'joined') {
          setPhase('joined');
          return;
        }
        setPhase('not-joined');
        try {
          const o = await client.prepareJoin();
          if (!cancelled) { setOffer(o); setOfferFailed(false); }
        } catch (_e) {
          if (!cancelled) setOfferFailed(true);
        }
      } catch (_e) {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [client, reloadKey]);

  // Thread + live feed while joined.
  useEffect(() => {
    if (phase !== 'joined') return;
    let cancelled = false;
    const unsubscribe = client.onMessage((m) => {
      if (!cancelled) setMessages((cur) => mergeMessages(cur, [m]));
    });
    client.thread()
      .then((lines) => { if (!cancelled) setMessages((cur) => mergeMessages(cur, lines)); })
      .catch(() => { /* the live feed and the next send still work */ });
    return () => { cancelled = true; unsubscribe(); };
  }, [client, phase]);

  // Presence while joined: on open, then every `presencePollMs` while the page is visible.
  useEffect(() => {
    if (phase !== 'joined') return;
    let cancelled = false;
    const refresh = (): void => {
      if (typeof document !== 'undefined' && document.hidden) return;
      client.presence()
        .then((p) => { if (!cancelled) setPresence(p); })
        // The service being down is reported as offline: the team cannot answer through it either.
        .catch(() => { if (!cancelled) setPresence({ online: false, agents: 0 }); });
    };
    refresh();
    const timer = setInterval(refresh, presencePollMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, [client, phase, presencePollMs]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  const doJoin = useCallback(async () => {
    setJoining(true);
    setJoinFailed(false);
    try {
      await client.join();
      setPhase('joined');
      onJoined?.();
    } catch (_e) {
      setJoinFailed(true);
    } finally {
      setJoining(false);
    }
  }, [client, onJoined]);

  const doSend = useCallback(async () => {
    const text = draft.trim();
    if (text === '' || sending) return;
    setSending(true);
    setSendFailed(false);
    try {
      const m = await client.send(text);
      setMessages((cur) => mergeMessages(cur, [m]));
      setDraft('');
    } catch (_e) {
      setSendFailed(true);
    } finally {
      setSending(false);
    }
  }, [client, draft, sending]);

  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      doSend();
    }
  };

  const doNotify = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!emailConsent || notifyState === 'sending') return;
    setNotifyState('sending');
    setNotifyError(null);
    try {
      await client.notifyMe(email, { consent: true, lang });
      setNotifyState('done');
    } catch (err) {
      if (isSupportError(err, 'already-sent')) {
        setNotifyState('already-sent');
        return;
      }
      setNotifyState('idle');
      setNotifyError(
        isSupportError(err, 'invalid-parameters')
          ? lb.notifyInvalidEmail
          : isSupportError(err, 'unknown-thread') ? lb.notifyUnknownThread : lb.notifyError
      );
    }
  };

  const root = `flex flex-col text-sm text-gray-900 dark:text-gray-100 ${className}`;

  if (phase === 'loading') {
    return <div className={root} data-testid='support-loading'><p className='p-4 text-gray-500 dark:text-gray-400'>{lb.loading}</p></div>;
  }

  if (phase === 'error') {
    return (
      <div className={root} data-testid='support-error'>
        <div className='m-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
          <p>{lb.loadError}</p>
          <button type='button' className={`${BUTTON_SECONDARY} mt-3`} onClick={() => setReloadKey((k) => k + 1)}>{lb.retry}</button>
        </div>
      </div>
    );
  }

  if (phase === 'not-joined') {
    const consentText = dpoText ?? (offer?.consent != null ? (offer.consent[lang] ?? offer.consent.en ?? null) : null);
    return (
      <div className={root} data-testid='support-not-joined'>
        <div className='p-4'>
          <p className='mb-4'>{lb.intro}</p>
          {refused && (
            <div className='rounded-lg border border-gray-200 p-4 dark:border-gray-700' data-testid='support-refused'>
              <p>{lb.refusedNotice}</p>
              <button type='button' className={`${BUTTON_SECONDARY} mt-3`} onClick={() => setRefused(false)}>{lb.reviewAgain}</button>
            </div>
          )}
          {!refused && offerFailed && (
            <div role='alert' className='rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'>
              <p>{lb.offerError}</p>
              <button type='button' className={`${BUTTON_SECONDARY} mt-3`} onClick={() => setReloadKey((k) => k + 1)}>{lb.retry}</button>
            </div>
          )}
          {!refused && !offerFailed && offer == null && <p className='text-gray-500 dark:text-gray-400'>{lb.loading}</p>}
          {!refused && offer != null && (
            <ConsentPanel
              app={{ name: lb.teamName }}
              title={lb.consentTitle}
              consentText={consentText ?? undefined}
              permissions={offer.permissions.map((p) => ({ ...p, defaultName: lb.placeholderStreamName }))}
              busy={joining ? 'accepting' : false}
              labels={lb.consent}
              onAccept={() => { doJoin(); }}
              onRefuse={() => { setRefused(true); onRefuse?.(); }}
            >
              <p className='rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-primary-900 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-100' data-testid='support-chat-only'>
                {lb.chatOnlyNotice}
              </p>
              {joinFailed && <p role='alert' className='mt-3 text-red-700 dark:text-red-400'>{lb.joinError}</p>}
            </ConsentPanel>
          )}
        </div>
      </div>
    );
  }

  // Joined.
  const offline = presence != null && !presence.online;
  const hasWritten = messages.some((m) => m.mine);
  return (
    <div className={root} data-testid='support-joined'>
      {presence != null && (
        offline
          ? (
            <div role='status' className='border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100' data-testid='support-presence-offline'>
              <p className='font-semibold'>{lb.offline}</p>
              <p className='text-xs'>{lb.offlineHint}</p>
            </div>
            )
          : (
            <div role='status' className='flex items-center gap-2 border-b border-gray-200 px-4 py-2 text-gray-600 dark:border-gray-700 dark:text-gray-300' data-testid='support-presence-online'>
              <span aria-hidden className='inline-block h-2 w-2 rounded-full bg-green-500' />
              <p>{lb.online}</p>
            </div>
            )
      )}

      <ol className='flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3' data-testid='support-thread' aria-live='polite'>
        {messages.length === 0 && <li className='py-6 text-center text-gray-500 dark:text-gray-400'>{lb.emptyThread}</li>}
        {messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`} data-mine={m.mine ? 'true' : 'false'}>
            {!m.mine && (
              <span className='mb-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400' data-testid='support-byline'>{m.author ?? lb.teamName}</span>
            )}
            <div
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${
                m.mine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {m.text}
            </div>
            <span className='mt-0.5 text-[11px] text-gray-400'>{timeOf(m.time, lang)}</span>
          </li>
        ))}
        <li ref={threadEnd} aria-hidden className='h-0' />
      </ol>

      {offline && hasWritten && (
        <div className='border-t border-gray-200 px-4 py-3 dark:border-gray-700' data-testid='support-notify'>
          {notifyState === 'done' && <p role='status'>{lb.notifyDone}</p>}
          {notifyState === 'already-sent' && <p role='status'>{lb.notifyAlreadySent}</p>}
          {(notifyState === 'idle' || notifyState === 'sending') && (
            <form onSubmit={(e) => { doNotify(e); }} data-testid='support-notify-form' noValidate>
              <p className='mb-2 font-semibold'>{lb.notifyTitle}</p>
              <label className='block'>
                <span className='mb-1 block text-xs text-gray-600 dark:text-gray-300'>{lb.notifyEmail}</span>
                <input
                  type='email'
                  name='email'
                  autoComplete='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-gray-600 dark:bg-gray-900'
                />
              </label>
              <label className='mt-2 flex items-start gap-2'>
                <input
                  type='checkbox'
                  name='consent'
                  className='mt-1'
                  checked={emailConsent}
                  onChange={(e) => setEmailConsent(e.target.checked)}
                />
                <span className='text-xs text-gray-600 dark:text-gray-300'>{lb.notifyConsent}</span>
              </label>
              {notifyError != null && <p role='alert' className='mt-2 text-red-700 dark:text-red-400'>{notifyError}</p>}
              <button
                type='submit'
                className={`${BUTTON_PRIMARY} mt-3 w-full sm:w-auto`}
                disabled={!emailConsent || email.trim() === '' || notifyState === 'sending'}
              >
                {notifyState === 'sending' ? lb.notifySubmitting : lb.notifySubmit}
              </button>
            </form>
          )}
        </div>
      )}

      <form
        className='border-t border-gray-200 px-4 py-3 dark:border-gray-700'
        onSubmit={(e) => { e.preventDefault(); doSend(); }}
        data-testid='support-composer'
      >
        <p className='mb-2 text-xs text-gray-500 dark:text-gray-400' data-testid='support-medical-notice'>{lb.medicalNotice}</p>
        {sendFailed && <p role='alert' className='mb-2 text-red-700 dark:text-red-400'>{lb.sendError}</p>}
        <div className='flex items-end gap-2'>
          <textarea
            aria-label={lb.composerLabel}
            placeholder={lb.composerPlaceholder}
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onComposerKey}
            maxLength={MAX_MESSAGE_LENGTH}
            className='min-h-11 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-gray-600 dark:bg-gray-900'
          />
          <button type='submit' className={BUTTON_PRIMARY} disabled={sending || draft.trim() === ''}>
            {sending ? lb.sending : lb.send}
          </button>
        </div>
      </form>
    </div>
  );
}
