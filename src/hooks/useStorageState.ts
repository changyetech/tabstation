import { useCallback, useEffect, useRef, useState } from 'react';
import { readKey, writeKey, type StorageKey } from '../lib/storage';

/** 写入器：直传新值，或传函数基于「最新已提交值」求新值（避免陈旧快照覆盖，见下方注释） */
export type StorageWriter<T> = (next: T | ((prev: T) => T)) => Promise<void>;

// storage.local 读写 + onChanged 跨页同步（spec §6「多管理页一致性」）
export function useStorageState<T>(key: StorageKey, fallback: T): [T, StorageWriter<T>] {
  const [value, setValue] = useState<T>(fallback);
  // 挂载时的初始读与紧随其后的 write 是两条独立的 Promise 链，微任务跳数不同，
  // 初始读可能晚于 write 落盘后才 resolve，用它的过期快照覆盖刚写入的值。
  // 用该 ref 标记「本次订阅周期内已发生过写入」，读回来时若已写入则丢弃这份过期快照。
  const writtenRef = useRef(false);
  // 最新已提交值：函数式写入的基准。渲染期闭包捕获的 value 可能已过期——
  // 典型场景是「退场动画结束后（300ms）才提交」的删除：期间的其他写入会被它按旧快照覆盖回去
  const latestRef = useRef<T>(value);

  const commit = useCallback((next: T) => {
    latestRef.current = next;
    setValue(next);
  }, []);

  useEffect(() => {
    let alive = true;
    writtenRef.current = false;
    void readKey(key, fallback).then((v) => {
      if (alive && !writtenRef.current) commit(v);
    });
    const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && key in changes) {
        commit((changes[key].newValue as T | undefined) ?? fallback);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(listener);
    };
    // fallback 视为常量（调用方传字面量），不进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, commit]);

  const write = useCallback<StorageWriter<T>>(
    async (next) => {
      const resolved =
        typeof next === 'function' ? (next as (prev: T) => T)(latestRef.current) : next;
      writtenRef.current = true;
      commit(resolved);
      await writeKey(key, resolved);
    },
    [key, commit],
  );

  return [value, write];
}
