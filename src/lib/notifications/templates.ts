// Notification templates for myWash events

interface NotificationTemplate {
  title: string;
  body: string;
}

type TemplateData = Record<string, string>;

function interpolate(template: string, data: TemplateData): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || "");
}

const TEMPLATES_ES: Record<string, { title: string; body: string }> = {
  wash_scheduled: {
    title: "Lavado programado",
    body: "Tu lavado para {car} esta programado el {date}.",
  },
  wash_started: {
    title: "Lavado en progreso",
    body: "Tu {car} esta siendo lavado ahora mismo.",
  },
  wash_completed: {
    title: "Lavado completado!",
    body: "Tu {car} esta listo. Ve las fotos del resultado.",
  },
  wash_cancelled: {
    title: "Lavado cancelado",
    body: "Tu lavado del {date} ha sido cancelado.",
  },
  evidence_uploaded: {
    title: "Evidencia disponible",
    body: "Las fotos de tu lavado ya estan disponibles.",
  },
  upsell_offer: {
    title: "Recomendacion de tu lavador",
    body: "{washer} recomienda {service} para tu {car}.",
  },
  survey_request: {
    title: "Como estuvo tu lavado?",
    body: "Califica el lavado de tu {car} en 30 segundos.",
  },
  payment_succeeded: {
    title: "Pago confirmado",
    body: "Tu pago de {amount} fue procesado exitosamente.",
  },
  payment_failed: {
    title: "Pago fallido",
    body: "No pudimos procesar tu pago. Actualiza tu metodo de pago.",
  },
  subscription_renewed: {
    title: "Suscripcion renovada",
    body: "Tu plan {plan} se renuvo exitosamente.",
  },
  low_stock_alert: {
    title: "Alerta de inventario",
    body: "{item} esta por debajo del minimo en {location}.",
  },
  daily_offer: {
    title: "Lavado disponible hoy!",
    body: "Estamos en {location} hoy. Reserva tu lavado ahora.",
  },
  damage_report: {
    title: "Dano reportado",
    body: "Se reporto un dano pre-existente en tu {car}.",
  },
  message_received: {
    title: "Nuevo mensaje",
    body: "{sender} te envio un mensaje.",
  },
  general: {
    title: "myWash",
    body: "{message}",
  },
};

export function getNotificationContent(
  type: string,
  data: TemplateData,
  lang = "es"
): NotificationTemplate {
  const templates = lang === "es" ? TEMPLATES_ES : TEMPLATES_ES; // TODO: add English
  const template = templates[type] || templates.general;
  return {
    title: interpolate(template.title, data),
    body: interpolate(template.body, data),
  };
}
