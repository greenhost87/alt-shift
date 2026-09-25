export function createEventStreamCompletionTracker() {
  let trailingFrame = '';
  return {
    feed(chunk: string) {
      trailingFrame += chunk;
      const boundaries = [...trailingFrame.matchAll(/(?:\r\n|\r|\n){2}/g)];
      const lastBoundary = boundaries.at(-1);
      if (lastBoundary?.index !== undefined) {
        trailingFrame = trailingFrame.slice(lastBoundary.index + lastBoundary[0].length);
      }
    },
    hasIncompleteEvent() {
      return /(?:^|\r\n|\r|\n)(?:event|data):/.test(trailingFrame);
    },
  };
}
