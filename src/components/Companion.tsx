import { useEffect, useMemo } from 'react';
import { useI18n } from '../i18n';
import {
  companionFacts,
  companionStage,
  HEAD_ITEMS,
  itemProgress,
  newItems,
  nextCompanionStage,
  unlockedItems,
  wornItem,
} from '../lib/companion';
import { readSeenItems, setWearing, useWearing, writeSeenItems } from '../store/companion';
import { useAttempts, useCardReviews, useCatalog, useMocks, useRehearsals, useToday } from '../store/queries';
import { Capybara, HeadItemIcon } from './Capybara';
import { useToast } from './toast';
import { Sheet } from './ui';

// 陪刷題的卡皮巴拉：今天卡的演算法樹下面有一隻（components/AlgorithmTree.tsx），
// 進度頁有完整的樣子和頭上的收藏；收集到新道具時跳出慶祝訊息

/** 卡皮巴拉現在的樣子：長到哪個階段、今天有沒有練習、收集到什麼、戴著哪一個；資料還沒讀完是 null */
export function useCompanion() {
  const attempts = useAttempts();
  const mocks = useMocks();
  const cardReviews = useCardReviews();
  const rehearsals = useRehearsals();
  const catalog = useCatalog();
  const today = useToday();
  const wearing = useWearing();
  return useMemo(() => {
    if (!attempts || !mocks || !cardReviews || !rehearsals || !catalog.loaded) return null;
    const facts = companionFacts({ attempts, mocks, cardReviews, rehearsals, patternOf: (id) => catalog.byId.get(id)?.pattern });
    const unlocked = unlockedItems(facts);
    // 今天練過（跟連續天數一樣，做微複習也算）就很開心，還沒練在打瞌睡
    const practicedToday = [...attempts.filter((a) => a.mode !== 'import'), ...mocks, ...cardReviews, ...rehearsals].some((r) => r.day === today);
    return {
      facts,
      unlocked,
      stage: companionStage(facts.practiceDays),
      next: nextCompanionStage(facts.practiceDays),
      mood: practicedToday ? ('happy' as const) : ('sleepy' as const),
      item: wornItem(wearing, unlocked),
    };
  }, [attempts, mocks, cardReviews, rehearsals, catalog, today, wearing]);
}

/**
 * 收集到新的頭飾時慶祝；同時拿到兩個就放在同一則（畫面最多三則慶祝訊息，不要擠掉「已儲存」）。
 * 一次來很多（示範資料、同步）就只記下來
 */
export function CompanionWatcher() {
  const { t } = useI18n();
  const toast = useToast();
  const companion = useCompanion();
  const unlocked = companion?.unlocked;

  useEffect(() => {
    if (!unlocked) return;
    const { items, celebrate } = newItems(readSeenItems(), unlocked);
    writeSeenItems(unlocked);
    if (!celebrate) return;
    toast(
      t.companion.unlocked(items.map((item) => t.companion.items[item]).join(t.companion.and), items.length),
      'win',
      items.map((item) => <HeadItemIcon key={item} item={item} className="win-icon" />),
    );
  }, [unlocked, toast, t]);

  return null;
}

/** 進度頁：卡皮巴拉現在的樣子，和頭上的收藏（收集到的點一下戴上） */
export function CompanionSheet() {
  const { t } = useI18n();
  const m = t.companion;
  const companion = useCompanion();
  if (!companion) return null;
  const { facts, unlocked, stage, next, mood, item } = companion;

  return (
    <Sheet title={m.title} id="companion" note={m.note}>
      <div className="sheet-body companion">
        <div className="companion-hero">
          <Capybara stage={stage} mood={mood} item={item} className="capybara capybara-big" />
          <div className="companion-status">
            <p className="companion-name">{m.stages[stage]}</p>
            <p>
              {m.days(facts.practiceDays)}
              {next && m.nextStage(next.needed, m.stages[next.stage])}
            </p>
            <p className="companion-mood">{m.moods[mood]}</p>
          </div>
        </div>

        <h3 className="readiness-subtitle">{m.collected(unlocked.length, HEAD_ITEMS.length)}</h3>
        <ul className="head-items">
          {HEAD_ITEMS.map((id) => {
            const progress = itemProgress(facts, id);
            const content = (
              <>
                <HeadItemIcon item={id} locked={!progress.done} />
                <strong>{m.items[id]}</strong>
                <span>{m.goals[id]}</span>
                {!progress.done && <span className="head-item-progress">{m.progress(progress.have, progress.goal)}</span>}
                {item === id && <span className="tag">{m.wearing}</span>}
              </>
            );
            return (
              <li key={id}>
                {progress.done ? (
                  <button type="button" className="head-item-slot" aria-pressed={item === id} onClick={() => setWearing(id)}>
                    {content}
                  </button>
                ) : (
                  <div className="head-item-slot" data-locked>
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {item && (
          <div className="btn-row">
            <button type="button" className="btn btn-small" onClick={() => setWearing('none')}>
              {m.takeOff}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
