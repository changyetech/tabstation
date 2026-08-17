import { useT } from '../i18n';
import './CopyrightFooter.css';

export interface CopyrightFooterProps {
  /** 是否显示设置入口；设置页自身不显示（自指） */
  showOptions?: boolean;
}

export function CopyrightFooter({ showOptions = false }: CopyrightFooterProps) {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="copyright-footer">
      <a href="https://tabstation.omnikit.run" target="_blank" rel="noreferrer noopener">
        {t('footer.brand')}
      </a>
      {showOptions && (
        <>
          <span className="footer-sep">·</span>
          <button
            type="button"
            className="footer-action"
            onClick={() => void chrome.runtime.openOptionsPage()}
          >
            {t('footer.options')}
          </button>
        </>
      )}
      <span className="footer-sep">·</span>
      <span>{t('footer.copyrightYear', { year })}</span>{' '}
      <a href="https://changyetech.com" target="_blank" rel="noreferrer noopener">
        {t('footer.companyName')}
      </a>
    </footer>
  );
}
