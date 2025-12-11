import { IncidentData } from '../components/Incident'

// Liste des incidents actifs et résolus récents
export const incidents: IncidentData[] = [
  // ⚠️ TEST: Exemple de maintenance programmée (MULTILANGUE)

  {
    id: 'maintenance-test-info',
    type: 'info',
    title: {
      en: 'Scheduled maintenance',
      fr: 'Maintenance planifiée'
    },
    message: {
      en: 'Maintenance window scheduled for tonight from 02:00 to 04:00 UTC. Some services may be temporarily unavailable.',
      fr: 'Fenêtre de maintenance prévue ce soir de 02h00 à 04h00 UTC. Certains services peuvent être temporairement indisponibles.'
    },
    timestamp: new Date().toISOString(),
    affectedServices: ['example-website', 'example-api'],
  }
  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 EXEMPLES D'UTILISATION - Décommentez selon vos besoins
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ Incident résolu (multilangue)
  // {
  //   id: 'incident-2025-12-08-001',
  //   type: 'resolved',
  //   title: {
  //     en: 'Issue resolved',
  //     fr: 'Problème résolu'
  //   },
  //   message: {
  //     en: 'The service interruption has been resolved. All systems are now operational.',
  //     fr: 'L\'interruption de service a été résolue. Tous les systèmes sont maintenant opérationnels.'
  //   },
  //   timestamp: '2025-12-08T15:45:00.000Z',
  //   affectedServices: ['example-website'],
  // },

  // ⚠️ Avertissement de maintenance (multilangue)
  // {
  //   id: 'maintenance-2025-12-10',
  //   type: 'warning',
  //   title: {
  //     en: 'Scheduled maintenance',
  //     fr: 'Maintenance planifiée'
  //   },
  //   message: {
  //     en: 'We will be performing scheduled maintenance on December 10th from 02:00 to 04:00 UTC. Some services may be temporarily unavailable.',
  //     fr: 'Nous effectuerons une maintenance planifiée le 10 décembre de 02h00 à 04h00 UTC. Certains services peuvent être temporairement indisponibles.'
  //   },
  //   timestamp: '2025-12-09T10:00:00.000Z',
  //   affectedServices: ['example-website', 'example-api'],
  // },

  // ℹ️ Information (multilangue)
  // {
  //   id: 'info-2025-12-09-001',
  //   type: 'info',
  //   title: {
  //     en: 'New monitoring system',
  //     fr: 'Nouveau système de surveillance'
  //   },
  //   message: {
  //     en: 'We have upgraded our monitoring system to provide better real-time status updates.',
  //     fr: 'Nous avons mis à niveau notre système de surveillance pour fournir de meilleures mises à jour de statut en temps réel.'
  //   },
  //   timestamp: '2025-12-09T09:00:00.000Z',
  // },

  // 🔴 Erreur critique (multilangue)
  // {
  //   id: 'error-2025-12-10-001',
  //   type: 'error',
  //   title: {
  //     en: 'Service outage',
  //     fr: 'Panne de service'
  //   },
  //   message: {
  //     en: 'We are experiencing a service outage affecting multiple services. Our team is investigating.',
  //     fr: 'Nous rencontrons une panne de service affectant plusieurs services. Notre équipe enquête.'
  //   },
  //   timestamp: new Date().toISOString(),
  //   affectedServices: ['example-website', 'example-api', 'example-cdn'],
  // },

  // 📌 Format simple (rétrocompatible - une seule langue)
  // {
  //   id: 'simple-incident',
  //   type: 'info',
  //   title: 'System update',
  //   message: 'Our systems have been updated with the latest security patches.',
  //   timestamp: new Date().toISOString(),
  // },
]

// Fonction helper pour récupérer les incidents actifs (non résolus + résolus récents)
export function getActiveIncidents(): IncidentData[] {
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000 // 24 heures

  return incidents.filter((incident) => {
    // Garder les incidents non résolus
    if (incident.type !== 'resolved') return true

    // Pour les incidents résolus, garder seulement ceux < 24h
    const incidentTime = new Date(incident.timestamp).getTime()
    return incidentTime > oneDayAgo
  })
}

// Fonction helper pour vérifier s'il y a des incidents actifs critiques
export function hasCriticalIncidents(): boolean {
  return incidents.some((incident) => incident.type === 'error')
}
