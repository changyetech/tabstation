import { useCallback, useEffect, useRef, useState } from 'react';
import { readKey, writeKey, type StorageKey } from '../lib/storage';

// storage.local 读写 + onChanged 跨页同步（spec §6「多管理页一致性」）
export function useStorageState<T>(key: StorageKey, fallback: T): [T, (next: T) => Promise<void>] {
  const [value, setValue] = useState<T>(fallback);
  // 挂载时的初始读与紧随其后的 write 是两条独立的 Promise 链，微任务跳数不同，
  // 初始读可能晚于 write 落盘后才 resolve，用它的过期快照覆盖刚写入的值。
  // 用该 ref 标记「本次订阅周期内已发生过写入」，读回来时若已写入则丢弃这份过期快照。
  const writtenRef = useRef(false);

  useEffect(() => {
    let alive = true;
    writtenRef.current = false;
    void readKey(key, fallback).then((v) => {
      if (alive && !writtenRef.current) setValue(v);
    });
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && key in changes) {
        setValue((changes[key].newValue as T | undefined) ?? fallback);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(listener);
    };
    // fallback 视为常量（调用方传字面量），不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const write = useCallback(
    async (next: T) => {
      writtenRef.current = true;
      setValue(next);
      await writeKey(key, next);
    },
    [key],
  );

  return [value, write];
}
