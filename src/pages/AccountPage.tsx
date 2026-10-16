import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { GITHUB_RESULTS, type GithubResult } from '../../shared/protocol';
import { AccountSection } from '../components/AccountSection';
import { PageHead } from '../components/ui';
import { useI18n } from '../i18n';

const GITHUB_PROBLEMS: ReadonlySet<GithubResult> = new Set(['email-taken', 'in-use', 'no-email', 'failed']);

function isGithubResult(value: string | null): value is GithubResult {
  return (GITHUB_RESULTS as readonly string[]).includes(value ?? '');
}

/** 登入、註冊與同步狀態；側邊欄、「更多」和今天頁都直接連到這裡 */
export function AccountPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  // 用 GitHub 登入後會回到 #/account?github=<結果>：記下結果，再把網址清乾淨（重新整理就不會再顯示）
  const param = params.get('github');
  const [github] = useState<GithubResult | null>(() => (isGithubResult(param) ? param : null));
  useEffect(() => {
    if (param !== null) setParams({}, { replace: true });
  }, [param, setParams]);

  return (
    <div className="page">
      <PageHead title={t.account.pageTitle} />
      {github && (
        <p className={GITHUB_PROBLEMS.has(github) ? 'form-error github-result' : 'notice github-result'} role={GITHUB_PROBLEMS.has(github) ? 'alert' : 'status'}>
          {t.account.github.results[github]}
        </p>
      )}
      <AccountSection />
    </div>
  );
}
