/* eslint-disable no-undef */
setInterval(() => {
  self.serviceWorker.postMessage("test");
}, 10000);

self.oninstall = () => {
  console.log('serviceWorker.js install');
  try {
    // import the singleton "background" scripts to start the extension
    importScripts(
      '../common/config.js',
      '../common/commonWeVote.js',
      '../common/globalState.js',
      'backgroundWeVoteAPICalls.js',
      'extWordHighlighter.js');
  } catch (e) {
    console.log('ERROR serviceWorker.js install:', JSON.stringify(e));
  }
};
