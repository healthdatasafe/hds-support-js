import type { ConsentPanelLabels } from 'hds-forms-js';

/** Every text `<SupportChat>` draws. */
export interface SupportChatLabels {
  /** Fallback byline of a team line without a `"<name>: "` prefix; also the `{app}` of the consent panel's labels. */
  teamName: string;
  loading: string;
  loadError: string;
  retry: string;
  /** Not joined: what the channel is, above the consent panel. */
  intro: string;
  /** Title of the consent panel. */
  consentTitle: string;
  /** Plan 117 A2: shown on the consent screen, word for word. */
  chatOnlyNotice: string;
  /** How the placeholder permission is named in the consent list. */
  placeholderStreamName: string;
  offerError: string;
  joinError: string;
  /** After "Refuse". */
  refusedNotice: string;
  reviewAgain: string;
  online: string;
  offline: string;
  offlineHint: string;
  emptyThread: string;
  /** Plan 117 R2: above the composer. */
  medicalNotice: string;
  composerPlaceholder: string;
  composerLabel: string;
  send: string;
  sending: string;
  sendError: string;
  notifyTitle: string;
  notifyEmail: string;
  /** The consent checkbox of the notify form: what is stored, for what, and for how long. */
  notifyConsent: string;
  notifySubmit: string;
  notifySubmitting: string;
  notifyDone: string;
  notifyAlreadySent: string;
  notifyInvalidEmail: string;
  /** `/notify` answered `unknown-thread`: the user is no longer joined (left from Connections, or closed by the team). */
  notifyUnknownThread: string;
  notifyError: string;
  /** Labels of the embedded `ConsentPanel` (hds-forms-js). */
  consent: Partial<ConsentPanelLabels>;
}

export const SUPPORT_CHAT_LABELS_EN: SupportChatLabels = {
  teamName: 'Health Data Safe team',
  loading: 'Loading…',
  loadError: 'The support channel cannot be reached right now.',
  retry: 'Try again',
  intro: 'Ask the Health Data Safe team for help. The conversation stays in your account, under Connections.',
  consentTitle: 'Contact the Health Data Safe team',
  chatOnlyNotice: 'The HDS team can only exchange messages with you; it has no access to your health data.',
  placeholderStreamName: 'Support channel (holds no data)',
  offerError: 'The support channel is not available right now. Please try again later.',
  joinError: 'Joining the support channel failed. Please try again.',
  refusedNotice: 'You can contact the team whenever you need.',
  reviewAgain: 'Contact the team',
  online: 'Someone from the team is online.',
  offline: 'Nobody is online right now',
  offlineHint: 'Write your message: the team answers as soon as possible.',
  emptyThread: 'No messages yet. Say hello!',
  medicalNotice: 'Please do not share medical details here.',
  composerPlaceholder: 'Write a message',
  composerLabel: 'Message',
  send: 'Send',
  sending: 'Sending…',
  sendError: 'Your message was not sent. Please try again.',
  notifyTitle: 'Notify me by email',
  notifyEmail: 'Email address',
  notifyConsent: 'I agree that HDS keeps this address to send me one email, without the message content, when the team answers. It is deleted after that email, or after 30 days.',
  notifySubmit: 'Notify me',
  notifySubmitting: 'Saving…',
  notifyDone: 'Thank you. We will email you when the team answers.',
  notifyAlreadySent: 'You were already notified of an answer in this conversation.',
  notifyInvalidEmail: 'Please enter a valid email address.',
  notifyUnknownThread: 'This conversation has ended, so we cannot notify you. Reopen Help & support to contact the team again.',
  notifyError: 'Your address could not be saved. Please try again.',
  consent: {}
};

export const SUPPORT_CHAT_LABELS_FR: SupportChatLabels = {
  teamName: 'Équipe Health Data Safe',
  loading: 'Chargement…',
  loadError: 'Le canal d’assistance est injoignable pour le moment.',
  retry: 'Réessayer',
  intro: 'Demandez de l’aide à l’équipe Health Data Safe. La conversation reste dans votre compte, sous Connexions.',
  consentTitle: 'Contacter l’équipe Health Data Safe',
  chatOnlyNotice: 'L’équipe HDS peut seulement échanger des messages avec vous ; elle n’a aucun accès à vos données de santé.',
  placeholderStreamName: 'Canal d’assistance (ne contient aucune donnée)',
  offerError: 'Le canal d’assistance n’est pas disponible pour le moment. Veuillez réessayer plus tard.',
  joinError: 'La connexion au canal d’assistance a échoué. Veuillez réessayer.',
  refusedNotice: 'Vous pouvez contacter l’équipe dès que vous en avez besoin.',
  reviewAgain: 'Contacter l’équipe',
  online: 'Un membre de l’équipe est en ligne.',
  offline: 'Personne n’est en ligne pour le moment',
  offlineHint: 'Écrivez votre message : l’équipe répond dès que possible.',
  emptyThread: 'Aucun message pour l’instant. Dites bonjour !',
  medicalNotice: 'Merci de ne pas partager d’informations médicales ici.',
  composerPlaceholder: 'Écrire un message',
  composerLabel: 'Message',
  send: 'Envoyer',
  sending: 'Envoi…',
  sendError: 'Votre message n’a pas été envoyé. Veuillez réessayer.',
  notifyTitle: 'Me prévenir par e-mail',
  notifyEmail: 'Adresse e-mail',
  notifyConsent: 'J’accepte que HDS conserve cette adresse pour m’envoyer un seul e-mail, sans le contenu du message, quand l’équipe répond. Elle est effacée après cet e-mail, ou après 30 jours.',
  notifySubmit: 'Me prévenir',
  notifySubmitting: 'Enregistrement…',
  notifyDone: 'Merci. Nous vous enverrons un e-mail quand l’équipe répondra.',
  notifyAlreadySent: 'Vous avez déjà été prévenu·e d’une réponse dans cette conversation.',
  notifyInvalidEmail: 'Veuillez saisir une adresse e-mail valide.',
  notifyUnknownThread: 'Cette conversation est terminée, nous ne pouvons donc pas vous prévenir. Rouvrez Aide et assistance pour contacter l’équipe à nouveau.',
  notifyError: 'Votre adresse n’a pas pu être enregistrée. Veuillez réessayer.',
  consent: {
    eyebrow: 'Demande d’autorisation',
    requesting: '{app} demande l’autorisation de :',
    noPermissions: 'Aucune autorisation particulière demandée.',
    streamAll: 'Toutes les données',
    levelRead: 'lire',
    levelContribute: 'contribuer à',
    levelManage: 'gérer',
    footnote: 'Vous pouvez révoquer cet accès à tout moment depuis votre compte.',
    expiresAfter: 'Expire après : {seconds} s',
    mismatchWarning: 'Cette application a déjà un accès avec d’autres autorisations. Accepter le mettra à jour.',
    required: 'obligatoire',
    accept: 'Autoriser',
    refuse: 'Refuser',
    accepting: 'Autorisation…',
    refusing: 'Refus…'
  }
};

/** The default label set of a language (`fr*` → French, anything else → English). */
export function supportChatLabels (lang?: string | null): SupportChatLabels {
  return typeof lang === 'string' && lang.toLowerCase().startsWith('fr') ? SUPPORT_CHAT_LABELS_FR : SUPPORT_CHAT_LABELS_EN;
}
