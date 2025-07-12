export const retryWithDelay = async (
  fn: () => Promise<any>, 
  retries = 2, 
  delay = 1000
): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
      console.log(`Retry attempt, ${retries} remaining...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};