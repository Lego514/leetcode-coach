import { BEHAVIORAL_THEMES, type BehavioralTheme } from '../../shared/constants';
import type { Phrase } from './interview';

// 行為面試：常見題目依主題分類，每一題附中文翻譯和面試官想看什麼；STAR 每一段的英文開頭句。
// 主題的名稱和說明在 i18n 字典的 stories.themes。

export { BEHAVIORAL_THEMES, type BehavioralTheme };

export interface BehavioralQuestion {
  id: string;
  theme: BehavioralTheme;
  /** 面試時聽到的英文題目 */
  en: string;
  zh: string;
  /** 面試官想從這題看到什麼 */
  focus: Phrase;
}

export const BEHAVIORAL_QUESTIONS: BehavioralQuestion[] = [
  {
    id: 'conflict-disagree',
    theme: 'conflict',
    en: 'Tell me about a time you disagreed with a teammate. How did you handle it?',
    zh: '說一次你和隊友意見不合的經驗，你怎麼處理？',
    focus: { en: 'Whether you listen first, use data, and keep working well together.', zh: '會不會先聽、用資料說話，並且維持合作關係。' },
  },
  {
    id: 'conflict-difficult',
    theme: 'conflict',
    en: 'Describe a time you had to work with someone who was difficult to work with.',
    zh: '說一次你和很難合作的人共事的經驗。',
    focus: { en: 'Empathy, and getting the work done without blaming anyone.', zh: '能不能站在對方的角度、不推卸責任，把事情完成。' },
  },
  {
    id: 'conflict-pushback',
    theme: 'conflict',
    en: 'Tell me about a time you pushed back on a decision.',
    zh: '說一次你反對某個決定的經驗。',
    focus: { en: 'Disagreeing respectfully, then committing once the decision is made.', zh: '能不能有禮貌地提出不同意見，決定之後就全力配合。' },
  },
  {
    id: 'failure-failed',
    theme: 'failure',
    en: 'Tell me about a time you failed.',
    zh: '說一次你失敗的經驗。',
    focus: { en: 'Owning it, and what you changed afterwards.', zh: '承認是自己的責任，以及之後改了什麼。' },
  },
  {
    id: 'failure-mistake',
    theme: 'failure',
    en: 'Describe a mistake you made at work or school and how you fixed it.',
    zh: '說一次你犯了錯、後來怎麼補救的經驗。',
    focus: { en: 'How fast you noticed and recovered, and how you kept it from happening again.', zh: '多快發現、怎麼補救，以及怎麼避免再發生。' },
  },
  {
    id: 'failure-plan',
    theme: 'failure',
    en: 'Tell me about a project that didn’t go as planned.',
    zh: '說一個沒有照計畫走的專案。',
    focus: { en: 'Adapting along the way and reflecting honestly afterwards.', zh: '過程中怎麼調整、事後怎麼誠實檢討。' },
  },
  {
    id: 'leadership-led',
    theme: 'leadership',
    en: 'Tell me about a time you led a project or a team.',
    zh: '說一次你帶專案或帶團隊的經驗。',
    focus: { en: 'Setting a direction and helping other people do their best work.', zh: '設定方向，讓其他人做得好。' },
  },
  {
    id: 'leadership-initiative',
    theme: 'leadership',
    en: 'Describe a time you took initiative without being asked.',
    zh: '說一次你沒被要求就主動去做的經驗。',
    focus: { en: 'Ownership beyond your assigned role.', zh: '超出自己負責範圍的主動。' },
  },
  {
    id: 'leadership-mentor',
    theme: 'leadership',
    en: 'Tell me about a time you helped a teammate grow.',
    zh: '說一次你幫助隊友成長的經驗。',
    focus: { en: 'Mentoring and sharing what you know.', zh: '帶人、分享自己會的東西。' },
  },
  {
    id: 'deadline-tight',
    theme: 'deadline',
    en: 'Tell me about a time you worked under a tight deadline.',
    zh: '說一次在很趕的期限下工作的經驗。',
    focus: { en: 'Prioritizing, and being clear about the trade-offs.', zh: '排優先順序，並且把取捨說清楚。' },
  },
  {
    id: 'deadline-priorities',
    theme: 'deadline',
    en: 'Describe a time you had to juggle several priorities at once.',
    zh: '說一次你同時要處理好幾件事的經驗。',
    focus: { en: 'How you decide what matters most.', zh: '你怎麼決定什麼最重要。' },
  },
  {
    id: 'deadline-missed',
    theme: 'deadline',
    en: 'Tell me about a time you missed a deadline.',
    zh: '說一次你沒趕上期限的經驗。',
    focus: { en: 'Raising the risk early and taking responsibility.', zh: '有沒有提早示警、負起責任。' },
  },
  {
    id: 'ambiguity-unclear',
    theme: 'ambiguity',
    en: 'Tell me about a time you worked with unclear requirements.',
    zh: '說一次需求不清楚時你怎麼做。',
    focus: { en: 'Asking the right questions and still moving forward.', zh: '問對問題，在不確定中往前推進。' },
  },
  {
    id: 'ambiguity-decision',
    theme: 'ambiguity',
    en: 'Describe a decision you made without having all the information.',
    zh: '說一次資訊不完整時你做的決定。',
    focus: { en: 'Judgment, and how you limited the risk.', zh: '判斷力，以及你怎麼控制風險。' },
  },
  {
    id: 'ambiguity-unknown',
    theme: 'ambiguity',
    en: 'Tell me about a time you solved a problem nobody knew how to approach.',
    zh: '說一次你解決一個大家都不知道怎麼下手的問題。',
    focus: { en: 'Breaking a vague problem into concrete steps.', zh: '怎麼把模糊的問題拆成具體的步驟。' },
  },
  {
    id: 'influence-convince',
    theme: 'influence',
    en: 'Tell me about a time you convinced others to adopt your idea.',
    zh: '說一次你說服別人採用你的想法。',
    focus: { en: 'Persuading with evidence and addressing people’s concerns.', zh: '用證據說服人，並回應對方的疑慮。' },
  },
  {
    id: 'influence-authority',
    theme: 'influence',
    en: 'Describe a time you influenced someone without having authority over them.',
    zh: '說一次你沒有職權，卻影響了別人的經驗。',
    focus: { en: 'Building trust and getting people aligned.', zh: '建立信任，讓大家方向一致。' },
  },
  {
    id: 'influence-explain',
    theme: 'influence',
    en: 'Tell me about a time you explained something technical to a non-technical person.',
    zh: '說一次你向不懂技術的人解釋技術問題。',
    focus: { en: 'Clarity, and adjusting to your audience.', zh: '講得清楚，並依對象調整說法。' },
  },
  {
    id: 'learning-quickly',
    theme: 'learning',
    en: 'Tell me about a time you had to learn something new quickly.',
    zh: '說一次你必須很快學會新東西的經驗。',
    focus: { en: 'How you learn, and how quickly you put it to use.', zh: '你怎麼學，以及多快能用上。' },
  },
  {
    id: 'learning-self',
    theme: 'learning',
    en: 'Describe a technology you picked up on your own.',
    zh: '說一個你自己學會的技術。',
    focus: { en: 'Curiosity and learning on your own.', zh: '好奇心和自學能力。' },
  },
  {
    id: 'learning-comfort',
    theme: 'learning',
    en: 'Tell me about a time you stepped outside your comfort zone.',
    zh: '說一次你走出舒適圈的經驗。',
    focus: { en: 'Willingness to grow.', zh: '願不願意成長。' },
  },
  {
    id: 'proud-project',
    theme: 'proud',
    en: 'What project are you most proud of, and why?',
    zh: '你最自豪的專案是什麼？為什麼？',
    focus: { en: 'Your specific contribution and technical depth.', zh: '你自己的貢獻和技術深度。' },
  },
  {
    id: 'proud-hardest',
    theme: 'proud',
    en: 'Tell me about the hardest technical problem you’ve solved.',
    zh: '說一個你解過最難的技術問題。',
    focus: { en: 'How you solve problems, and persistence.', zh: '解決問題的過程，以及毅力。' },
  },
  {
    id: 'proud-beyond',
    theme: 'proud',
    en: 'Describe a time you went above and beyond what was expected.',
    zh: '說一次你做得比要求更多的經驗。',
    focus: { en: 'Ownership and high standards.', zh: '負責任和高標準。' },
  },
  {
    id: 'feedback-received',
    theme: 'feedback',
    en: 'Tell me about a time you received critical feedback.',
    zh: '說一次你收到負面回饋的經驗。',
    focus: { en: 'Being open to it and acting on it.', zh: '能不能接受，並且真的改進。' },
  },
  {
    id: 'feedback-gave',
    theme: 'feedback',
    en: 'Describe a time you gave difficult feedback to someone.',
    zh: '說一次你給別人困難回饋的經驗。',
    focus: { en: 'Being honest while staying kind.', zh: '誠實，又顧及對方的感受。' },
  },
  {
    id: 'feedback-changed',
    theme: 'feedback',
    en: 'Tell me about a time you changed your mind.',
    zh: '說一次你改變想法的經驗。',
    focus: { en: 'Being willing to admit you were wrong.', zh: '願意承認自己錯了。' },
  },
  {
    id: 'teamwork-success',
    theme: 'teamwork',
    en: 'Tell me about a time you helped your team succeed.',
    zh: '說一次你幫助團隊成功的經驗。',
    focus: { en: 'Putting the team’s result ahead of your own credit.', zh: '重視團隊的成果，而不是個人的功勞。' },
  },
  {
    id: 'teamwork-struggling',
    theme: 'teamwork',
    en: 'Describe a time you joined a team that was already struggling.',
    zh: '說一次你加入一個已經出狀況的團隊。',
    focus: { en: 'Understanding the situation before acting.', zh: '先了解狀況再行動。' },
  },
  {
    id: 'teamwork-diverse',
    theme: 'teamwork',
    en: 'Tell me about a time you worked with people from different backgrounds.',
    zh: '說一次你和不同背景的人合作的經驗。',
    focus: { en: 'Communicating across cultures and roles.', zh: '跨文化、跨角色的溝通。' },
  },
];

export const STAR_PARTS = ['situation', 'task', 'action', 'result'] as const;
export type StarPart = (typeof STAR_PARTS)[number];

/** STAR 每一段可以怎麼開頭 */
export const STAR_PHRASES: Record<StarPart, Phrase[]> = {
  situation: [
    { en: 'At the time, I was working on…', zh: '那時候我在做……' },
    { en: 'Our team was facing…', zh: '我們團隊遇到……' },
    { en: 'The challenge was that…', zh: '困難的地方是……' },
  ],
  task: [
    { en: 'My role was to…', zh: '我負責的是……' },
    { en: 'I was responsible for…', zh: '我要負責……' },
    { en: 'The goal was to…, and I owned…', zh: '目標是……，我負責其中的……' },
  ],
  action: [
    { en: 'First, I… Then I…', zh: '首先我……，接著我……' },
    { en: 'I decided to… because…', zh: '我決定……，因為……' },
    { en: 'To make sure…, I…', zh: '為了確保……，我……' },
  ],
  result: [
    { en: 'As a result, …', zh: '結果……' },
    { en: 'This cut … from … to …', zh: '這讓……從……降到……' },
    { en: 'What I learned was…', zh: '我學到的是……' },
  ],
};
