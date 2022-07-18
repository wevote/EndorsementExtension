self.oninstall = () => {
  console.log('serviceWorker.js install');
  try {
    importScripts(
      'extWordHighlighter.js',
      'backgroundWeVoteAPICalls.js',
      '../commonWeVote.js');
  } catch (e) {
    // No DOM or equivalent here yet, so can't call console.error('serviceWorker load error', e);
  }
};
