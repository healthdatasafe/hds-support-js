import type { ConsentPanelLabels } from 'hds-forms-js';
import { pickLanguage } from '../language';

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

// Plan 138: es, it and pt-BR are machine drafts shipped before a native review.
export const SUPPORT_CHAT_LABELS_ES: SupportChatLabels = {
  teamName: 'Equipo de Health Data Safe',
  loading: 'Cargando…',
  loadError: 'No se puede acceder al canal de asistencia en este momento.',
  retry: 'Reintentar',
  intro: 'Pida ayuda al equipo de Health Data Safe. La conversación permanece en su cuenta, en Conexiones.',
  consentTitle: 'Contactar con el equipo de Health Data Safe',
  chatOnlyNotice: 'El equipo de HDS solo puede intercambiar mensajes con usted; no tiene acceso a sus datos de salud.',
  placeholderStreamName: 'Canal de asistencia (no contiene datos)',
  offerError: 'El canal de asistencia no está disponible en este momento. Inténtelo más tarde.',
  joinError: 'No se pudo entrar en el canal de asistencia. Inténtelo de nuevo.',
  refusedNotice: 'Puede contactar con el equipo siempre que lo necesite.',
  reviewAgain: 'Contactar con el equipo',
  online: 'Hay alguien del equipo en línea.',
  offline: 'No hay nadie en línea en este momento',
  offlineHint: 'Escriba su mensaje: el equipo responde lo antes posible.',
  emptyThread: 'Aún no hay mensajes. ¡Salúdenos!',
  medicalNotice: 'Por favor, no comparta datos médicos aquí.',
  composerPlaceholder: 'Escribir un mensaje',
  composerLabel: 'Mensaje',
  send: 'Enviar',
  sending: 'Enviando…',
  sendError: 'Su mensaje no se ha enviado. Inténtelo de nuevo.',
  notifyTitle: 'Avisarme por correo electrónico',
  notifyEmail: 'Dirección de correo electrónico',
  notifyConsent: 'Acepto que HDS conserve esta dirección para enviarme un solo correo electrónico, sin el contenido del mensaje, cuando el equipo responda. La dirección se elimina después de ese correo, o al cabo de 30 días.',
  notifySubmit: 'Avisarme',
  notifySubmitting: 'Guardando…',
  notifyDone: 'Gracias. Le enviaremos un correo electrónico cuando el equipo responda.',
  notifyAlreadySent: 'Ya se le ha avisado de una respuesta en esta conversación.',
  notifyInvalidEmail: 'Introduzca una dirección de correo electrónico válida.',
  notifyUnknownThread: 'Esta conversación ha terminado, por lo que no podemos avisarle. Vuelva a abrir Ayuda y asistencia para contactar de nuevo con el equipo.',
  notifyError: 'No se pudo guardar su dirección. Inténtelo de nuevo.',
  consent: {
    eyebrow: 'Solicitud de permiso',
    requesting: '{app} solicita permiso para:',
    noPermissions: 'Esta aplicación no declara ningún permiso específico.',
    streamAll: 'Todos los datos',
    levelRead: 'leer',
    levelContribute: 'contribuir a',
    levelManage: 'gestionar',
    footnote: 'Puede revocar este acceso en cualquier momento desde su cuenta.',
    expiresAfter: 'Caduca después de: {seconds} s',
    mismatchWarning: 'Esta aplicación ya tiene un acceso con permisos diferentes. Al aprobar, ese acceso se actualizará.',
    required: 'obligatorio',
    accept: 'Permitir',
    refuse: 'Rechazar',
    accepting: 'Permitiendo…',
    refusing: 'Rechazando…'
  }
};

export const SUPPORT_CHAT_LABELS_IT: SupportChatLabels = {
  teamName: 'Team di Health Data Safe',
  loading: 'Caricamento…',
  loadError: 'Al momento il canale di assistenza non è raggiungibile.',
  retry: 'Riprova',
  intro: 'Chieda aiuto al team di Health Data Safe. La conversazione resta nel suo account, in Connessioni.',
  consentTitle: 'Contatta il team di Health Data Safe',
  chatOnlyNotice: 'Il team HDS può solo scambiare messaggi con lei; non ha alcun accesso ai suoi dati sanitari.',
  placeholderStreamName: 'Canale di assistenza (non contiene dati)',
  offerError: 'Al momento il canale di assistenza non è disponibile. Riprovi più tardi.',
  joinError: 'Impossibile accedere al canale di assistenza. Riprovi.',
  refusedNotice: 'Può contattare il team ogni volta che ne ha bisogno.',
  reviewAgain: 'Contatta il team',
  online: 'Qualcuno del team è online.',
  offline: 'Nessuno è online al momento',
  offlineHint: 'Scriva il suo messaggio: il team risponde appena possibile.',
  emptyThread: 'Ancora nessun messaggio. Scriva un saluto!',
  medicalNotice: 'La preghiamo di non condividere qui informazioni mediche.',
  composerPlaceholder: 'Scriva un messaggio',
  composerLabel: 'Messaggio',
  send: 'Invia',
  sending: 'Invio in corso…',
  sendError: 'Il suo messaggio non è stato inviato. Riprovi.',
  notifyTitle: 'Avvisami via e-mail',
  notifyEmail: 'Indirizzo e-mail',
  notifyConsent: 'Accetto che HDS conservi questo indirizzo per inviarmi una sola e-mail, senza il contenuto del messaggio, quando il team risponde. L’indirizzo viene eliminato dopo quell’e-mail, o dopo 30 giorni.',
  notifySubmit: 'Avvisami',
  notifySubmitting: 'Salvataggio…',
  notifyDone: 'Grazie. Le invieremo un’e-mail quando il team risponderà.',
  notifyAlreadySent: 'Ha già ricevuto un avviso per una risposta in questa conversazione.',
  notifyInvalidEmail: 'Inserisca un indirizzo e-mail valido.',
  notifyUnknownThread: 'Questa conversazione è terminata, quindi non possiamo avvisarla. Riapra Aiuto e assistenza per contattare di nuovo il team.',
  notifyError: 'Impossibile salvare il suo indirizzo. Riprovi.',
  consent: {
    eyebrow: 'Richiesta di autorizzazione',
    requesting: '{app} chiede l’autorizzazione a:',
    noPermissions: 'Nessuna autorizzazione specifica dichiarata da questa app.',
    streamAll: 'Tutti i dati',
    levelRead: 'leggere',
    levelContribute: 'contribuire a',
    levelManage: 'gestire',
    footnote: 'Può revocare questo accesso in qualsiasi momento dal suo account.',
    expiresAfter: 'Scade dopo: {seconds} s',
    mismatchWarning: 'Questa app ha già un accesso con autorizzazioni diverse. Se approva, l’accesso verrà aggiornato.',
    required: 'obbligatorio',
    accept: 'Autorizza',
    refuse: 'Rifiuta',
    accepting: 'Autorizzazione in corso…',
    refusing: 'Rifiuto in corso…'
  }
};

export const SUPPORT_CHAT_LABELS_PT_BR: SupportChatLabels = {
  teamName: 'Equipe Health Data Safe',
  loading: 'Carregando…',
  loadError: 'Não é possível acessar o canal de suporte no momento.',
  retry: 'Tentar novamente',
  intro: 'Peça ajuda à equipe Health Data Safe. A conversa fica na sua conta, em Conexões.',
  consentTitle: 'Falar com a equipe Health Data Safe',
  chatOnlyNotice: 'A equipe do HDS só pode trocar mensagens com você; ela não tem nenhum acesso aos seus dados de saúde.',
  placeholderStreamName: 'Canal de suporte (não contém dados)',
  offerError: 'O canal de suporte não está disponível no momento. Tente novamente mais tarde.',
  joinError: 'Não foi possível entrar no canal de suporte. Tente novamente.',
  refusedNotice: 'Você pode falar com a equipe sempre que precisar.',
  reviewAgain: 'Falar com a equipe',
  online: 'Alguém da equipe está online.',
  offline: 'Ninguém está online no momento',
  offlineHint: 'Escreva sua mensagem: a equipe responde assim que possível.',
  emptyThread: 'Nenhuma mensagem ainda. Diga olá!',
  medicalNotice: 'Não compartilhe detalhes médicos aqui.',
  composerPlaceholder: 'Escreva uma mensagem',
  composerLabel: 'Mensagem',
  send: 'Enviar',
  sending: 'Enviando…',
  sendError: 'Sua mensagem não foi enviada. Tente novamente.',
  notifyTitle: 'Receber aviso por e-mail',
  notifyEmail: 'Endereço de e-mail',
  notifyConsent: 'Concordo que o HDS guarde este endereço para me enviar um único e-mail, sem o conteúdo da mensagem, quando a equipe responder. O endereço é apagado após esse e-mail ou após 30 dias.',
  notifySubmit: 'Receber aviso',
  notifySubmitting: 'Salvando…',
  notifyDone: 'Agradecemos. Enviaremos um e-mail a você quando a equipe responder.',
  notifyAlreadySent: 'Você já recebeu um aviso de resposta nesta conversa.',
  notifyInvalidEmail: 'Digite um endereço de e-mail válido.',
  notifyUnknownThread: 'Esta conversa foi encerrada, por isso não podemos avisar você. Abra Ajuda e suporte novamente para voltar a falar com a equipe.',
  notifyError: 'Não foi possível salvar seu endereço. Tente novamente.',
  consent: {
    eyebrow: 'Solicitação de permissão',
    requesting: '{app} está pedindo permissão para:',
    noPermissions: 'Nenhuma permissão específica declarada por este aplicativo.',
    streamAll: 'Todos os dados',
    levelRead: 'ler',
    levelContribute: 'contribuir para',
    levelManage: 'gerenciar',
    footnote: 'Você pode revogar este acesso a qualquer momento na sua conta.',
    expiresAfter: 'Expira após: {seconds} s',
    mismatchWarning: 'Este aplicativo já tem um acesso com permissões diferentes. A aprovação o atualizará.',
    required: 'obrigatório',
    accept: 'Permitir',
    refuse: 'Recusar',
    accepting: 'Permitindo…',
    refusing: 'Recusando…'
  }
};

/** The label sets by language tag; a new language is one set here. */
const LABELS: Readonly<Record<string, SupportChatLabels>> = {
  en: SUPPORT_CHAT_LABELS_EN,
  fr: SUPPORT_CHAT_LABELS_FR,
  es: SUPPORT_CHAT_LABELS_ES,
  it: SUPPORT_CHAT_LABELS_IT,
  'pt-BR': SUPPORT_CHAT_LABELS_PT_BR
};

/** The default label set of a language (`fr-CH` → French), English for a language without one. */
export function supportChatLabels (lang?: string | null): SupportChatLabels {
  return LABELS[pickLanguage(lang, Object.keys(LABELS)) ?? 'en'];
}
