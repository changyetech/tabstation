import { useEffect, useRef, useState } from 'react';
import Toast from '../components/Toast';
import { Icon } from '../components/icons';
import { I18nProvider, resolveLanguage, useT } from '../i18n';
import { useStorageState } from '../hooks/useStorageState';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from '../lib/storage';

const NAV_IDS = ['appearance', 'behavior', 'language', 'shortcuts', 'about'] as const;

export default function App() {
  const [rawSettings, setSettings] = useStorageState<Settings>('settings', DEFAULT_SETTINGS);
  // 旧版本落盘数据可能缺新字段，读侧统一合并兜底
  const settings = mergeSettings(rawSettings);
  const language = resolveLanguage(settings.language, navigator.language);

  return (
    <I18nProvider language={language}>
      <SettingsPage settings={settings} setSettings={(next) => void setSettings(next)} />
    </I18nProvider>
  );
}

// 主题迷你预览（设计稿 .mini）：固定色，不随主题变
function Mini({ kind }: { kind: 'light' | 'dark' | 'auto' }) {
  const pane = (variant: 'light' | 'dark') => (
    <span className={`mini-pane ${variant}`}>
      <span className="mini-bar">
        <span className="mini-dot" />
        <span className="mini-dot" />
        <span className="mini-dot" />
      </span>
      <span className="mini-row" />
      <span className="mini-row" style={{ width: '60%' }} />
    </span>
  );
  if (kind === 'auto') {
    return (
      <span className="mini">
        {pane('light')}
        {pane('dark')}
      </span>
    );
  }
  return <span className={`mini ${kind}`}>{pane(kind)}</span>;
}

function SettingsPage({
  settings,
  setSettings,
}: {
  settings: Settings;
  setSettings: (next: Settings) => void;
}) {
  const t = useT();
  useTheme(settings.theme);

  // 所有改动即时保存并生效（设计稿产品承诺），每次落盘弹 toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = (msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };
  const save = (patch: Partial<Settings>, msg = t('settings.saved')) => {
    setSettings({ ...settings, ...patch });
    showToast(msg);
  };

  // 左侧锚点导航：点击高亮
  const [activeNav, setActiveNav] = useState<string>('appearance');

  // 快捷键展示读实际绑定（spec §4），而非硬编码
  const [shortcut, setShortcut] = useState<string>('');
  useEffect(() => {
    void chrome.commands
      .getAll()
      .then((commands) =>
        setShortcut(commands.find((c) => c.name === 'open-manager')?.shortcut ?? ''),
      );
  }, []);
  const shortcutKeys = shortcut.includes('+') ? shortcut.split('+') : [...shortcut];

  const version = chrome.runtime.getManifest().version;

  const navLabel: Record<(typeof NAV_IDS)[number], string> = {
    appearance: t('settings.navAppearance'),
    behavior: t('settings.navBehavior'),
    language: t('settings.navLanguage'),
    shortcuts: t('settings.navShortcuts'),
    about: t('settings.navAbout'),
  };

  return (
    <>
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark">
            <Icon name="logo" size={15} />
          </span>
          <span className="brand-name">Tab Station</span>
          <span className="brand-ver num">v{version}</span>
        </span>
        <span className="topbar-spacer" />
      </header>

      <div className="layout">
        <nav className="side-nav">
          {NAV_IDS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeNav === id ? 'active' : undefined}
              onClick={() => setActiveNav(id)}
            >
              {navLabel[id]}
            </a>
          ))}
        </nav>

        <main>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-sub">{t('settings.pageSub')}</p>

          {/* 外观 */}
          <section className="group" id="appearance">
            <div className="group-head">
              <h2>{t('settings.navAppearance')}</h2>
              <p>{t('settings.appearanceDesc')}</p>
            </div>
            <div className="group-card">
              <div className="theme-options" role="group" aria-label={t('settings.navAppearance')}>
                {(['light', 'dark', 'auto'] as const).map((kind) => (
                  <button
                    key={kind}
                    className="theme-option"
                    aria-pressed={settings.theme === kind}
                    onClick={() => save({ theme: kind }, t('settings.themeSaved'))}
                  >
                    <span className="theme-check">
                      <Icon name="check" size={8} />
                    </span>
                    <Mini kind={kind} />
                    <span className="theme-option-label">
                      {kind === 'light'
                        ? t('settings.themeLight')
                        : kind === 'dark'
                          ? t('settings.themeDark')
                          : t('settings.themeAuto')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 行为 */}
          <section className="group" id="behavior">
            <div className="group-head">
              <h2>{t('settings.navBehavior')}</h2>
            </div>
            <div className="group-card">
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">{t('settings.managerPageScope')}</div>
                  <div className="setting-desc">{t('settings.scopeDesc')}</div>
                  <label className="radio-row">
                    <input
                      type="radio"
                      name="scope"
                      value="global"
                      checked={settings.managerPageScope === 'global'}
                      onChange={() => save({ managerPageScope: 'global' })}
                    />
                    <span>
                      <span className="radio-title">{t('settings.scopeGlobal')}</span>
                      <span className="radio-desc"> — {t('settings.scopeGlobalDesc')}</span>
                    </span>
                  </label>
                  <label className="radio-row">
                    <input
                      type="radio"
                      name="scope"
                      value="perWindow"
                      checked={settings.managerPageScope === 'per-window'}
                      onChange={() => save({ managerPageScope: 'per-window' })}
                    />
                    <span>
                      <span className="radio-title">{t('settings.scopePerWindow')}</span>
                      <span className="radio-desc"> — {t('settings.scopePerWindowDesc')}</span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">{t('settings.closeWindowAfterSave')}</div>
                  <div className="setting-desc">{t('settings.closeAfterSaveDesc')}</div>
                </div>
                <label className="switch-row setting-control">
                  <input
                    type="checkbox"
                    checked={settings.closeWindowAfterSave}
                    onChange={(e) => save({ closeWindowAfterSave: e.target.checked })}
                  />
                  <span className="switch" />
                </label>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">{t('settings.newWindowMode')}</div>
                  <div className="setting-desc">{t('settings.newWindowModeDesc')}</div>
                </div>
                <span className="setting-control">
                  <select
                    aria-label={t('settings.newWindowMode')}
                    value={settings.newWindowMode}
                    onChange={(e) =>
                      save({ newWindowMode: e.target.value as Settings['newWindowMode'] })
                    }
                  >
                    <option value="same">{t('settings.nwSame')}</option>
                    <option value="max">{t('settings.nwMax')}</option>
                  </select>
                </span>
              </div>
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">{t('settings.visibleTabs')}</div>
                  <div className="setting-desc">{t('settings.visibleTabsDesc')}</div>
                </div>
                <span className="setting-control">
                  <select
                    aria-label={t('settings.visibleTabs')}
                    value={String(settings.visibleTabs)}
                    onChange={(e) => {
                      const v = e.target.value;
                      save({
                        visibleTabs: v === 'all' ? 'all' : (Number(v) as 8 | 12 | 16),
                      });
                    }}
                  >
                    <option value="8">{t('settings.visibleTabs8')}</option>
                    <option value="12">{t('settings.visibleTabs12')}</option>
                    <option value="16">{t('settings.visibleTabs16')}</option>
                    <option value="all">{t('settings.visibleTabsAll')}</option>
                  </select>
                </span>
              </div>
            </div>
          </section>

          {/* 语言 */}
          <section className="group" id="language">
            <div className="group-head">
              <h2>{t('settings.navLanguage')}</h2>
            </div>
            <div className="group-card">
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">{t('settings.language')}</div>
                  <div className="setting-desc">{t('settings.languageDesc')}</div>
                </div>
                <span className="setting-control">
                  <select
                    aria-label={t('settings.language')}
                    value={settings.language}
                    onChange={(e) => save({ language: e.target.value as Settings['language'] })}
                  >
                    <option value="auto">{t('settings.langAuto')}</option>
                    <option value="zh-CN">{t('settings.langZh')}</option>
                    <option value="en">{t('settings.langEn')}</option>
                  </select>
                </span>
              </div>
            </div>
          </section>

          {/* 快捷键 */}
          <section className="group" id="shortcuts">
            <div className="group-head">
              <h2>{t('settings.navShortcuts')}</h2>
            </div>
            <div className="group-card">
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">{t('settings.shortcutOpenManager')}</div>
                  <div className="setting-desc">{t('settings.shortcutDesc')}</div>
                </div>
                <span className="setting-control">
                  <span>
                    {shortcut ? (
                      shortcutKeys.map((key, i) => <kbd key={i}>{key}</kbd>)
                    ) : (
                      <span className="setting-desc">{t('settings.shortcutUnset')}</span>
                    )}
                  </span>
                  <button
                    className="ghost-btn"
                    onClick={() =>
                      void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
                    }
                  >
                    {t('settings.shortcutEdit')}
                  </button>
                </span>
              </div>
            </div>
          </section>

          {/* 关于 */}
          <section className="group" id="about">
            <div className="group-head">
              <h2>{t('settings.navAbout')}</h2>
            </div>
            <div className="group-card">
              <div className="about-row">
                <span className="about-mark">
                  <Icon name="logo" size={22} />
                </span>
                <span>
                  <span className="about-name">{t('settings.aboutName')}</span>
                  <div className="about-meta num">{t('settings.aboutMeta', { v: version })}</div>
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>

      <Toast message={toast} />
    </>
  );
}
