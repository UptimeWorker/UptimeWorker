export type Language = 'en' | 'fr'

export interface Translations {
  // Header
  statusPage: string

  // Status Header
  allOperational: string
  notAllOperational: string
  lastChecked: string

  // Monitor Card
  operational: string
  degraded: string
  majorOutage: string
  down: string
  noData: string
  uptime: string
  daysAgo: string
  today: string

  // Uptime sections
  uptimeTitle: string
  lastHour: string
  last24Hours: string
  last3Days: string
  last7Days: string
  last30Days: string
  last90Days: string

  // Monitor Details
  overallUptime: string
  responseTime: string
  recentEvents: string
  running: string
  offline: string
  showingLastEvents: string
  noRecentEvents: string

  // Incidents
  affectedServices: string

  // About section
  aboutTitle: string
  aboutDescription: string
  aboutDescriptionFr: string
  visitWebsite: string

  // Footer
  allRightsReserved: string
  about: string
  terms: string
  privacy: string
  contact: string
  status: string

  // Language toggle
  switchToEnglish: string
  switchToFrench: string
  switchToEnglishTooltip: string
  switchToFrenchTooltip: string
  languageCode: string
}

export const translations: Record<Language, Translations> = {
  en: {
    // Header
    statusPage: 'Status Page',

    // Status Header
    allOperational: 'All Systems Operational',
    notAllOperational: 'Not All Systems Operational',
    lastChecked: 'Last checked',

    // Monitor Card
    operational: 'Operational',
    degraded: 'Degraded',
    majorOutage: 'Major outage',
    down: 'Down',
    noData: 'No data',
    uptime: 'uptime',
    daysAgo: '90 days ago',
    today: 'Today',

    // Uptime sections
    uptimeTitle: 'Uptime',
    lastHour: 'Last hour',
    last24Hours: 'Last 24 hours',
    last3Days: 'Last 3 days',
    last7Days: 'Last 7 days',
    last30Days: 'Last 30 days',
    last90Days: 'Last 90 days',

    // Monitor Details
    overallUptime: 'Overall Uptime',
    responseTime: 'Response time',
    recentEvents: 'Recent events',
    running: 'Running',
    offline: 'Down',
    showingLastEvents: 'Showing last 5 events',
    noRecentEvents: 'No recent events',

    // Incidents
    affectedServices: 'Affected services:',

    // About section
    aboutTitle: 'About this status page',
    aboutDescription: 'This page shows the real-time operational status of all monitored services. Data is refreshed automatically every 60 seconds. For more information, visit ',
    aboutDescriptionFr: '', // Not used in EN
    visitWebsite: 'uptimeworker.net',

    // Footer
    allRightsReserved: 'All rights reserved',
    about: 'About',
    terms: 'Terms',
    privacy: 'Privacy',
    contact: 'Contact',
    status: 'Status',

    // Language toggle
    switchToEnglish: 'English',
    switchToFrench: 'Français',
    switchToEnglishTooltip: 'Switch to English',
    switchToFrenchTooltip: 'Switch to French',
    languageCode: 'EN',
  },
  fr: {
    // Header
    statusPage: 'Page de Statut',

    // Status Header
    allOperational: 'Tous les Systèmes Opérationnels',
    notAllOperational: 'Tous les Systèmes ne Sont Pas Opérationnels',
    lastChecked: 'Dernière vérification',

    // Monitor Card
    operational: 'Opérationnel',
    degraded: 'Dégradé',
    majorOutage: 'Panne majeure',
    down: 'Hors ligne',
    noData: 'Aucune donnée',
    uptime: 'disponibilité',
    daysAgo: 'Il y a 90 jours',
    today: "Aujourd'hui",

    // Uptime sections
    uptimeTitle: 'Disponibilité',
    lastHour: 'Dernière heure',
    last24Hours: '24 dernières heures',
    last3Days: '3 derniers jours',
    last7Days: '7 derniers jours',
    last30Days: '30 derniers jours',
    last90Days: '90 derniers jours',

    // Monitor Details
    overallUptime: 'Disponibilité globale',
    responseTime: 'Temps de réponse',
    recentEvents: 'Événements récents',
    running: 'En ligne',
    offline: 'Hors ligne',
    showingLastEvents: 'Affichage des 5 derniers événements',
    noRecentEvents: 'Aucun événement récent',

    // Incidents
    affectedServices: 'Services affectés :',

    // About section
    aboutTitle: 'À propos de cette page de statut',
    aboutDescription: '', // Not used in FR
    aboutDescriptionFr: 'Cette page affiche l\'état opérationnel en temps réel de tous les services surveillés. Les données sont actualisées automatiquement toutes les 60 secondes. Pour plus d\'informations, visitez ',
    visitWebsite: 'uptimeworker.net',

    // Footer
    allRightsReserved: 'Tous droits réservés',
    about: 'À propos',
    terms: 'Conditions',
    privacy: 'Confidentialité',
    contact: 'Contact',
    status: 'Statut',

    // Language toggle
    switchToEnglish: 'English',
    switchToFrench: 'Français',
    switchToEnglishTooltip: 'Passer en anglais',
    switchToFrenchTooltip: 'Passer en français',
    languageCode: 'FR',
  },
}

export function getTranslations(lang: Language): Translations {
  return translations[lang]
}

export function detectLanguage(): Language {
  // Check localStorage first
  const saved = localStorage.getItem('language') as Language | null
  if (saved && (saved === 'en' || saved === 'fr')) {
    return saved
  }

  // Detect from browser
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('fr')) {
    return 'fr'
  }

  return 'en'
}
