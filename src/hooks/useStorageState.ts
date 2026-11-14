import { useCallback, useEffect, useRef, useState } from 'react';
import { readKey, updateKey, type StorageKey } from '../lib/storage';

/** 函数式写入在同源锁内基于最新持久化值执行，支持多页/后台并发。 */
export type StorageWriter<T> = (next: T | ((prev: T) => T)) => Promise<void>;

// storage.local 读写 + onChanged 跨页同步（spec §6「多管理页一致性」）
export function useStorageState<T>(key: StorageKey, fallback: T): [T, StorageWriter<T>] {
  const [value, setValue] = useState<T>(fallback);
  // fallback 视为常量；调用方通常传字面量，不能据其引用重新订阅。
  const fallbackRef = useRef(fallback);
  const revision = useRef(0);

  const commit = useCallback((next: T) => {
    revision.current += 1;
    setValue(next);
  }, []);

  useEffect(() => {
    const initialRevision = ++revision.current;
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && key in changes) {
        commit((changes[key].newValue as T | undefined) ?? fallbackRef.current);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    void readKey(key, fallbackRef.current).then((next) => {
      if (initialRevision === revision.current) commit(next);
    });
    return () => {
      revision.current += 1;
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [key, commit]);

  const write = useCallback<StorageWriter<T>>(
    async (next) => {
      const writeRevision = revision.current;
      const resolved = await updateKey(key, fallbackRef.current, next);
      // onChanged 可能先于 Promise 完成，且期间可能已有更新的跨页值。
      if (writeRevision === revision.current) commit(resolved);
    },
    [key, commit],
  );

  return [value, write];
}
