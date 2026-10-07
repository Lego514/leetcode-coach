import { AccountSection } from '../components/AccountSection';
import { PageHead } from '../components/ui';
import { useI18n } from '../i18n';

/** 登入、註冊與同步狀態；側邊欄、「更多」和今天頁都直接連到這裡 */
export function AccountPage() {
  const { t } = useI18n();
  return (
    <div className="page">
      <PageHead title={t.account.pageTitle} />
      <AccountSection />
    </div>
  );
}
