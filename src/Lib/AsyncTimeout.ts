// Server-side timeout wrapper. Rejects if the wrapped promise doesn't settle in
// time so a hung upstream (model/image/TTS provider) can't pin a request or a
// background task indefinitely. The underlying work may keep running, but the
// caller stops waiting on it.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
