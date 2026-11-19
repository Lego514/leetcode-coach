# Review scheduling

How the next review date is picked. What it looks like in the app is in [Features](features.md). Back to the [README](../README.md).

Problems are scheduled with FSRS-6 and its default parameters. Each self-rating maps to an FSRS grade:

| Self-rating | FSRS grade |
| --- | --- |
| Solved alone | Good |
| Needed a hint | Hard |
| Read the solution | Again |
| Still stuck | Again |

- The next review falls on the day your chance of remembering drops to the target retention (90% by default, 80–95% in Settings), at least 1 day and at most 120 days later.
- **Time weight**: when an attempt has minutes, its pace is minutes ÷ the problem's target (Easy 15, Medium 25, Hard 40). The weight is 1 up to the target, falls linearly to 0.6 at twice the target, and stays there. It multiplies how much stability grows on a successful review, or the starting stability on a first attempt. Attempts without minutes (like problems marked as solved before) use 1.
- **Hint depth and stuck reasons**: with Needed a hint, the deepest hint layer scales FSRS's Hard by 1.3, 1, 0.85, or 0.7 (pattern, key insight, edge cases, template), about 0.8, 0.6, 0.5, and 0.4 of a solo solve. A memory stuck reason (no approach, can't optimize, can't code it) multiplies by 0.75 and an execution one (syntax / API, logic / edge cases) by 0.9. Older records keep their codes: missed an edge case and had a bug count as logic / edge cases, and ran out of time adds nothing because the time weight covers it. All weights multiply.
- **One-week confirmation**: after Needed a hint, a memory stuck reason, or a successful solve at twice the target or slower, the interval is capped at 7 days while the stability stays as FSRS computed it. FSRS's default parameters come from flashcard reviews, where a hard recall still means you know it; on a coding problem, needing help usually means part of it is gone.
- With no minutes and no hint, the result is plain FSRS-6, which the tests check against `ts-fsrs`.
- **Easy**: a solo solve at half the target time or less, with no hints and no stuck reason, counts as FSRS's Easy when the same problem has a clear explanation within 3 days of it (`isEasy`, `explainedAround`). Explanations come from the explanation drill (out loud or typed) and from full mocks with AI feedback (`explanationMark` in `src/lib/explainProgress.ts`): clear is an AI average of 0.8 or more across the five points, or, without AI, all five points ticked and "Smooth". Saving or deleting an explanation rebuilds that problem's schedule.
- The interval sets the stage, and the mastery squares follow it one to one: under 7 days is learning, under 30 is reviewing, and 30 or more is "remembered". "Mastered" also needs the problem's latest explanation to be clear: you can't call it mastered if you can't explain it in an interview.
- The stage never decays on its own; what decays is the chance you still remember it (FSRS's forgetting curve). Below 70% (where readiness stops counting it and its leaf turns yellow) the square gets a hollow orange dot, below 55% a filled one (`fadeOf` in `src/lib/tree.ts`). "Weakest problems I've done" in mock interviews ranks by mastery times that chance (`strengthNow`), so a problem you mastered long ago and haven't touched comes up before one you just practiced.
- A problem's schedule is rebuilt by replaying its attempts in time order, which is why schedules don't need to be synced.
- Problems marked as solved before are spread so that at most five come due per day. The extra days are stored on the attempt (`delayDays`), so every device replays the same date.
- Flashcards use separate Leitner boxes (1, 3, 7, 14, then 30 days). A wrong answer sends a card back to box 0, so it returns in a later round the same day. Flashcards never move a problem's review date: recognizing a pattern is not the same as solving the problem. Cards answered today aren't used to pad a round, so a small topic gives a shorter round (or says it's done for today and offers Everything) instead of repeating the same cards. In Everything, at most 3 of the 5 cards are about problems, leaving room for pattern clues and Python tips.
