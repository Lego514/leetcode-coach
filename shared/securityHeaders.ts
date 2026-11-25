// 網頁（不是 /api）回應的安全標頭。Node 伺服器（server/src/app.ts）用這一份，
// Cloudflare 用 public/_headers，server/test/securityHeaders.test.ts 檢查兩邊一樣。
// 其他的 CSP 規則在 index.html 的 <meta>（src/lib/csp.ts），frame-ancestors 只能放在標頭。
export const PAGE_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  // 不能被別的網站用 iframe 嵌進去（點擊劫持）；X-Frame-Options 給不認得 frame-ancestors 的舊瀏覽器
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 麥克風給口頭講解用，其他用不到的一律關掉
  'Permissions-Policy': 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // 只走 https（瀏覽器在 http://localhost 會忽略這個標頭）
  'Strict-Transport-Security': 'max-age=31536000',
};
