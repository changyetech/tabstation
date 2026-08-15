import { useT } from '../i18n';
import type { Settings } from '../lib/storage';

export interface SettingsDialogProps {
  open: boolean;
  settings: Settings;
  onChange: (next: Settings) => void;
  onClose: () => void;
}

// 设置对话框（spec §6/§7）：改动即时落盘，onChanged 同步到其他管理页
export default function SettingsDialog({ open, settings, onChange, onClose }: SettingsDialogProps) {
  const t = useT();
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>⚙ {t('settings.title')}</h3>

        <fieldset>
          <legend>{t('settings.managerPageScope')}</legend>
          <label>
            <input
              type="radio"
              checked={settings.managerPageScope === 'global'}
              onChange={() => onChange({ ...settings, managerPageScope: 'global' })}
            />
            {t('settings.scopeGlobal')}
          </label>
          <label>
            <input
              type="radio"
              checked={settings.managerPageScope === 'per-window'}
              onChange={() => onChange({ ...settings, managerPageScope: 'per-window' })}
            />
            {t('settings.scopePerWindow')}
          </label>
        </fieldset>

        <label>
          <input
            type="checkbox"
            checked={settings.closeWindowAfterSave}
            onChange={(e) => onChange({ ...settings, closeWindowAfterSave: e.target.checked })}
          />
          {t('settings.closeWindowAfterSave')}
        </label>

        <label>
          {t('settings.language')}
          <select
            value={settings.language}
            onChange={(e) =>
              onChange({ ...settings, language: e.target.value as Settings['language'] })
            }
          >
            <option value="auto">{t('settings.langAuto')}</option>
            <option value="en">{t('settings.langEn')}</option>
            <option value="zh-CN">{t('settings.langZh')}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
