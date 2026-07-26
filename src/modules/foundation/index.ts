/**
 * Foundation public API.
 *
 * Shared platform primitives currently live under `src/platform` and migrate
 * here incrementally. Other modules must import Foundation only through this
 * entrypoint (or `src/modules/foundation`).
 */

export {
  TWENTY_COMPATIBILITY,
  isSupportedTwentyVersion,
} from 'src/platform/compatibility/twenty-compatibility';
