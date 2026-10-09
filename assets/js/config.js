/* Cime — configuration modifiable sans toucher au reste du code. */
window.CIME_CONFIG={
  // URL du webhook qui reçoit les demandes (Make, n8n, Zapier, Airtable Automations, CRM...).
  // Envoi en POST, format formulaire (application/x-www-form-urlencoded) : champs prenom, tel, email,
  // profil, sujet, creneau, page, source, ts ; la simulation arrive en JSON dans le champ "simulation".
  endpoint:'',
  // Widget de réservation (Cal.com, Calendly...) : coller l'URL d'intégration (iframe), ex. https://cal.com/equipe-cime/15min?embed=true
  booking:{url:''},
  // Repli e-mail UNIQUEMENT tant qu'aucun endpoint n'est renseigné (à vider en production).
  mailto:'contact@exemple.ch',
  // Plafonds 3a en vigueur. 2027 (annoncés en octobre 2026) : 7 373 CHF salarié, 36 864 CHF indépendant.
  plafond3a:{salarie:7258,independant:36288},
  avsRenteMin:1260                // rente AVS mensuelle minimale 2026 ; 2027 : 1 280 CHF (max. 2 560 CHF)
};
