/**
 * U5 驗證（製作核對模式）。
 * D5 起製作模式改為全螢幕 ProductionMode，原 U5 的斷言（「已稱 0/5」行內勾選）已不適用；
 * 同一功能的回歸驗證改由 verify-d5.mjs 負責，這支直接轉跑它，保留檔名讓舊流程不斷。
 *   node scripts/verify-u5.mjs
 */
await import('./verify-d5.mjs');
