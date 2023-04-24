export const promiseWithTimeout = async <T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> => {
  return new Promise(async (resolve, reject) => {
    const __timeoutExceeded__ = {};

    const result = await Promise.race([
      promise.catch(reject),
      wait(timeout, __timeoutExceeded__),
    ]);

    if (result === __timeoutExceeded__) reject("timeout exceeded");
    resolve(result as T);
  });
};

export const wait = <T>(
  delay: number,
  returnValue?: T
): Promise<T | undefined> =>
  new Promise((resolve) => setTimeout(() => resolve(returnValue), delay));
