# Data and privacy

What is stored where, and what leaves your device. Back to the [README](../README.md).

- **Without an account**, everything stays in the browser's IndexedDB. Export a backup from **Settings** before you switch browsers or clear site data.
- **With an account**:
  - Attempts, mock interviews and explanation drills, notes, tags, pattern notes, custom problems, settings, flashcard answers, whiteboards, and behavioral stories and practice sync to the server.
  - Audio recordings never leave the device, and backups don't include them either.
  - Transcripts are saved with the mock session and sync like the rest of your data.
- **Transcripts** are optional and use the browser's speech recognition. Chrome sends the audio to Google's servers to turn it into text. A typed explanation never uses speech recognition.
- **AI feedback** sends the transcript (or the typed explanation), how long you spoke, and the problem (number, title, difficulty, pattern) to Anthropic's API only when you press the button. Behavioral feedback also sends the question and the story's STAR notes; follow-ups send your explanation and answers. The server stores daily request and token counts per user, not the transcript itself.
  - Deleting the account removes it and all of its server data.
- **Your own AI key** stays in the browser. With it, requests go straight from the browser to the provider you picked, never through the server.
- **Sign in with GitHub** stores your GitHub user id and username with the account, and uses GitHub's verified email. The app doesn't keep the GitHub access token.
- **Password reset email** goes through Brevo, which gets your email address and the one-time link.
- **Daily reminders** store, per device, the browser's push address and keys, the hour you picked, your time zone and language, and the last day a reminder went out. The reminder goes through your browser's push service (for example Google's or Apple's), encrypted, and says only that you haven't practiced today or how long your streak is.
- **Error reports** (Sentry, when it is turned on) send the error, the page path, the browser, and the app version. They leave out your account, email, cookies, request contents (notes, transcripts, passwords), query strings, what you typed to the AI or got back, and console output.
- **Reports** you send store the message, the optional contact you typed (only when signed out), and the details listed on the form. They are linked to your account when you're signed in and deleted along with it.
- **Signing out** can either keep the local copy or clear it (for shared computers).
- **Visit counts**: the site at coach.legoli.dev uses Cloudflare Web Analytics, which counts page views without cookies and without following you to other sites. It sees the page address, the referring site, the browser and country, and page load times, not your data in the app. Running the app yourself or from the Render address doesn't include it.
- **Problem statements are not included.** The app stores only titles and links to leetcode.com.
