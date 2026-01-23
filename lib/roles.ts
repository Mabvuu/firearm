// lib/roles.ts
export const ROLES = [
  { value: 'dealer', label: 'Dealer' },

  { value: 'police.firearmofficer', label: 'Police – Firearm Officer' },
  { value: 'police.oic', label: 'Police – Officer In Charge' },

  { value: 'cfr.cfr', label: 'CFR' },
  { value: 'cfr.dispol', label: 'CFR – District Police' },
  { value: 'cfr.propol', label: 'CFR – Province Police' },

  { value: 'joc.oic', label: 'JOC – OIC' },
  { value: 'joc.mid', label: 'JOC – MID' },
  { value: 'joc.controller', label: 'JOC – Controller' }
] as const

export type Role = (typeof ROLES)[number]['value']

export const ROLE_VALUES = ROLES.map(r => r.value)
