// Headless client
export { SupportClient, errorIdOf } from './SupportClient';
export type { SupportClientOptions } from './SupportClient';
export { createPryvMonitor } from './monitor';
export { SupportError, isSupportError, SERVICE_ERROR_IDS } from './errors';
export type { SupportErrorId } from './errors';
export { parseSupportMessage, parseByline, toThread, CHAT_EVENT_TYPE, MAX_MESSAGE_LENGTH } from './messages';
export type {
  SupportConfig,
  SupportPresence,
  SupportStatus,
  SupportMessage,
  SupportOffer,
  SupportOfferPermission,
  SupportThreadInfo,
  SupportConnection,
  SupportMonitor,
  SupportMonitorFactory,
  SupportClientLike
} from './types';

// React widget
export { SupportChat } from './components/SupportChat';
export type { SupportChatProps } from './components/SupportChat';
export { SUPPORT_CHAT_LABELS_EN, SUPPORT_CHAT_LABELS_FR, supportChatLabels } from './components/supportChatLabels';
export type { SupportChatLabels } from './components/supportChatLabels';
