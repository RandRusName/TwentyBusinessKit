/**
 * Administration public API.
 *
 * Settings design and compatibility defaults. Reads module metadata from the
 * registry — not from Commercial Proposals internals.
 */

export type {
  CrmApplicationSettings,
  CrmApplicationSettingsProvider,
} from './application/crm-application-settings';
export { COMPATIBILITY_SETTINGS_DEFAULTS } from './application/crm-application-settings';
