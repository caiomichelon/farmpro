import { Platform } from 'react-native';

// Notificações locais (agendadas no aparelho) não são suportadas na web —
// todas as funções aqui viram no-op nesse caso, pra não quebrar o app
// rodando no navegador (inclusive nos testes automatizados).
const SUPPORTED = Platform.OS !== 'web';

// Import dinâmico: em ambientes sem suporte (web), nem carrega o módulo
// nativo.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Notifications = SUPPORTED ? (require('expo-notifications') as typeof import('expo-notifications')) : null;

let handlerConfigured = false;

function ensureHandler() {
  if (!SUPPORTED || !Notifications || handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Pede permissão de notificação ao usuário — chame antes de agendar pela
 * primeira vez. Retorna false na web ou se o usuário negar. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!SUPPORTED || !Notifications) return false;
  ensureHandler();
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

/** Agenda (ou reagenda, se já existir com o mesmo identifier) uma
 * notificação local pra uma data futura. Datas no passado são ignoradas —
 * não faz sentido "agendar" um alerta que já venceu; esses já aparecem na
 * central de alertas do app assim que ele é aberto. */
export async function scheduleLocalNotification(identifier: string, title: string, body: string, date: Date): Promise<void> {
  if (!SUPPORTED || !Notifications) return;
  if (date.getTime() <= Date.now()) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  } catch {
    // Agendamento é um extra — se falhar (ex.: permissão negada depois de
    // concedida), o app segue normal, só sem o lembrete no aparelho.
  }
}

export async function cancelLocalNotification(identifier: string): Promise<void> {
  if (!SUPPORTED || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // idem — best effort.
  }
}
