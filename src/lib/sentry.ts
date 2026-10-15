// 只用到 init 和 captureException：具名匯入才能讓打包工具丟掉用不到的部分（重播、效能追蹤…）
export { captureException, init } from '@sentry/react';
