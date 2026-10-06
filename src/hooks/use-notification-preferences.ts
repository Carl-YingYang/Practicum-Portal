"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { reportRequest } from "@/client/reports";
import type { NotificationItem } from "@/lib/use-notifications";
interface Preferences {
  sound: boolean;
  volume: number;
  readIds: string[];
  seenIds: string[];
}
const defaults: Preferences = {
  sound: false,
  volume: 0.35,
  readIds: [],
  seenIds: [],
};
export function useNotificationPreferences(
  accountId: string | undefined,
  notifications: NotificationItem[],
) {
  const [preferences, setPreferences] = useState(defaults),
    [loadedAccount, setLoadedAccount] = useState<string | undefined>(),
    [error, setError] = useState("");
  const ready = !!accountId && loadedAccount === accountId;
  const generation = useRef(0);
  const initialized = useRef(false),
    seen = useRef(new Set<string>()),
    audio = useRef<AudioContext | null>(null),
    revision = useRef(0),
    saved = useRef(0),
    latest = useRef(defaults),
    inFlight = useRef<Promise<void> | null>(null);
  const play = useCallback(async (volume: number) => {
    if (volume <= 0) return;
    if (!audio.current) audio.current = new AudioContext();
    await audio.current.resume();
    const context = audio.current,
      osc = context.createOscillator(),
      gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, context.currentTime);
    osc.frequency.linearRampToValueAtTime(880, context.currentTime + 0.09);
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(
      volume * 0.08,
      context.currentTime + 0.015,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.19);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 0.2);
  }, []);
  useEffect(() => {
    let cancelled = false;
    generation.current++;
    inFlight.current = null;
    initialized.current = false;
    seen.current = new Set();
    revision.current = 0;
    saved.current = 0;
    void reportRequest<Preferences>("/api/preferences/notifications")
      .then((p) => {
        if (!cancelled) {
          latest.current = p;
          setPreferences(p);
          setLoadedAccount(accountId);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
      void audio.current?.close();
      audio.current = null;
    };
  }, [accountId]);
  const change = useCallback((patch: Partial<Preferences>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    revision.current++;
    setPreferences(next);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const ids = notifications.map((n) => n.id);
    if (!initialized.current) {
      seen.current = new Set([...latest.current.seenIds, ...ids]);
      initialized.current = true;
      change({ seenIds: [...seen.current].slice(-2000) });
      return;
    }
    const added = ids.filter((id) => !seen.current.has(id));
    if (!added.length) return;
    for (const id of added) seen.current.add(id);
    change({ seenIds: [...seen.current].slice(-2000) });
    if (latest.current.sound && latest.current.volume > 0)
      void play(latest.current.volume).catch(() =>
        setError("Sound is unavailable. Visual notifications remain active."),
      );
  }, [notifications, ready, change, play]);
  const persist = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const epoch = generation.current;
    const work = async () => {
      try {
        while (
          epoch === generation.current &&
          saved.current !== revision.current
        ) {
          const captured = revision.current;
          await reportRequest("/api/preferences/notifications", "POST", {
            ...latest.current,
            accountId,
          });
          if (epoch !== generation.current) return;
          saved.current = captured;
        }
        if (epoch === generation.current) setError("");
      } catch (e) {
        if (epoch === generation.current) setError((e as Error).message);
      }
    };
    inFlight.current = work().finally(() => {
      inFlight.current = null;
    });
    return inFlight.current;
  }, [accountId]);
  useEffect(() => {
    if (!ready || saved.current === revision.current) return;
    const timer = setTimeout(() => void persist(), 350);
    return () => clearTimeout(timer);
  }, [preferences, ready, persist]);
  return {
    preferences,
    ready,
    error,
    readIds: new Set(preferences.readIds),
    markRead: (ids: string[]) =>
      change({
        readIds: [...new Set([...latest.current.readIds, ...ids])].slice(-2000),
      }),
    setSound: (sound: boolean) => {
      change({ sound });
      if (sound)
        void play(latest.current.volume).catch(() =>
          setError("Click Test sound to activate audio in this browser."),
        );
    },
    setVolume: (volume: number) => change({ volume }),
    testSound: () =>
      void play(latest.current.volume).catch(() =>
        setError("Audio is unavailable in this browser."),
      ),
    retry: () => void persist(),
  };
}
