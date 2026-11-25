import { z } from 'zod';

// zod 第一次檢查資料時會試 new Function("") 看能不能加速；網站的 CSP（src/lib/csp.ts）不允許 eval，
// 試的結果一定是不行，但瀏覽器還是會記一次違規。直接告訴 zod 不要試。main.tsx 最先 import 這個檔案。
z.config({ jitless: true });
