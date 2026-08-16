import { useT } from '../i18n';
import './CopyrightFooter.css';

export function CopyrightFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="copyright-footer">
      <span>{t('footer.copyrightYear', { year })}</span>{' '}
      <a href="https://changyetech.com" target="_blank" rel="noreferrer noopener">
        {t('footer.companyName')}
      </a>
    </footer>
  );
}
