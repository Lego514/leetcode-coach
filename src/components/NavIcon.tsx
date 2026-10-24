import type { ReactNode } from 'react';

// 導覽列的小圖示：側邊欄、手機分頁列、「更多」頁共用同一組，24×24、線條 1.8，跟著文字顏色

const ICONS: Record<string, ReactNode> = {
  // 打勾的日曆：今天要做的事
  today: <path d="M4 6.5h16M8 3v4M16 3v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9 2 2 4-4" />,
  // 繞一圈回來：複習
  review: <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" />,
  // 疊在一起的兩張卡片
  cards: <path d="M8 4h11a1 1 0 0 1 1 1v11M5 8h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />,
  // 進度頁有演算法樹，用一株兩片葉子的小芽
  progress: <path d="M12 21v-9M12 12c0-4.4 3.1-7.5 7.5-7.5 0 4.4-3.1 7.5-7.5 7.5ZM12 15c0-3.6-2.6-6-6-6 0 3.4 2.4 6 6 6Z" />,
  // 碼表：計時的模擬面試
  mock: <path d="M12 9v4l2.5 2.5M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM10 2h4" />,
  // 對話框：行為面試講故事
  stories: <path d="M5 4h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7l-4 4v-4H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 8.5h8M8 12h5" />,
  // 終點旗：衝刺到面試那天
  sprint: <path d="M5 21V4M5 4h12l-2.5 4L17 12H5" />,
  // 題目清單
  problems: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  // 燈泡：看出該用哪個模式
  patterns: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />,
  // 翻譯：面試用的英文句型
  phrases: <path d="M4 6h9M8.5 4v2M6 6c.3 3.5 2.6 6.5 6 8M11 6c-.6 3.6-3.1 6.6-7 8M13 20l4-9 4 9M14.4 17h5.2" />,
  // 畫架上的白板
  board: <path d="M4 4h16v11H4zM12 15v5M8.5 20h7M7.5 11.5l3-3 2.5 2.5 3.5-3.5" />,
  // 滑桿：調整設定
  settings: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" />,
  // 紙飛機：把問題寄出去
  feedback: <path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" />,
  // 四個方塊：更多頁面
  more: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
};

export function NavIcon({ name }: { name: string }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {icon}
    </svg>
  );
}
