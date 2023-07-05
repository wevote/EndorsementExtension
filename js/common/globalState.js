// New state object 2/8/2023 ONLY FOR WEVOTE ChromeExtension ... do not use this in WebApp
// Assumes only one active tab, which is a bit of a retreat from original plans, but provides manageable performance
// Prior to this change we were having one-minute delays loading a page with lots of endorsements and the right editor pane
/* global debugStorage, chrome */
/* eslint-disable no-unused-vars */

// debugStorage('loaded globalState js file');

const initialState = {
  allNames: '',
  candidateName: '',
  email: '',
  encodedHref: '',
  highlighterEnabled: false,
  highlighterLooping: false,
  isEnabled: false,
  isFromPDF: false,
  lastStateChange: 0,
  neverHighlightOn: {},
  noExactMatchOrgList: {},
  orgLogo: '',
  orgName: '',
  orgWebsite: '',
  organizationName: '',
  organizationTwitterHandle: '',
  organizationWeVoteId: 0,
  peakDefaultHighlights: [],
  pdfURL: '',
  photoURL: '',
  positions: [],
  positionsCount: 0,
  possibilityUrl: '',
  possibleOrgsList: [],
  priorData: [],
  priorHighlighterEnabledThisTab: false,
  refreshSideAreaNeeded: false,
  reloadTimeStamp: 0,
  showEditor: false,
  showHighlights: false,
  showPanels: false,
  tabId: -1,
  tabPreparedForHighlighting: false,
  twitterHandle: '',
  url: '',
  voterDeviceId: '',
  voterGuidePossibilityId: -1,
  voterGuideHighlights: {},
  voterIsSignedIn: false,
  voterWeVoteId: '',
  weVoteId: '',
  windowId: 0,
};

async function getGlobalState () {
  const state = await lowLevelGetStorage();
  debugStorage('state from lowLevelGetStorage:', state);
  const valid = state.hasOwnProperty('candidateName');
  debugStorage('getGlobalState state', state);
  if (valid) {
    debugStorage('getGlobalState returning valid potentialState ', state);
    return state;
  } else {
    await lowLevelSetStorage(initialState);
    debugStorage('getGlobalState initialized state');
    return initialState;
  }
}

async function updateGlobalState (dict) {
  debugStorage('updateGlobalState entry');
  const oldState = await lowLevelGetStorage();
  debugStorage('oldState updateGlobalState from updateGlobalState:', oldState);

  let state = dict;
  if (oldState) {
    state = { ...oldState, ...dict };
  }
  debugStorage('saveGlobalState old: ', oldState);
  debugStorage('saveGlobalState in updateGlobalState new merged state: ', state);
  await lowLevelSetStorage(state);
}

async function reInitializeGlobalState () {
  const oldState = (await lowLevelGetStorage());
  debugStorage('oldState reInitializeGlobalState from lowLevelGetStorage:', oldState);
  const newState = {
    ...initialState,
    voterDeviceId: oldState.voterDeviceId || '',
    voterIsSignedIn: oldState.voterIsSignedIn,
    photoURL: oldState.photoURL,
  };                   // Make a copy of the simple object
  await lowLevelSetStorage(newState);
  const newStateFromStorage = (await lowLevelGetStorage());
  debugStorage('reInitializeGlobalState initialized newStateFromStorage ', newStateFromStorage);
  return newStateFromStorage;
}

async function mergeToGlobalState (dict) {
  debugStorage('mergeToGlobalState dict:', dict);
  const stored = await lowLevelGetStorage();
  debugStorage('stored mergeToGlobalState from lowLevelGetStorage:', stored);

  return new Promise(() => {
    const newState = { ...stored, ...dict };
    debugStorage('mergeToGlobalState combine BEFORE state:', newState);
    lowLevelSetStorage(newState);
  });
}

async function getVoterDeviceId () {
  const state = await getGlobalState();
  return state.voterDeviceId;
}

// https://github.com/PreMiD/Extension/blob/5e9894de2c5e82d9425123ab353859158413e65d/src/util/functions/asyncStorage.ts

function lowLevelGetStorage () {
  // chrome.storage.local.get(null, function (items) {
  //   var allKeys = Object.keys(items);
  //   debugStorage('dump allKeys:', allKeys);
  // });
  return new Promise ((resolve) => {
    chrome.storage.local.get('extensionGlobalState', (items) => {
      // debugStorage('items IN lowLevelGetStorage:', items);
      const payloadObj = items.hasOwnProperty('extensionGlobalState') ? items['extensionGlobalState'] : {};
      // debugStorage('payload IN lowLevelGetStorage:', payloadObj);
      resolve(payloadObj);
    });
  });
}

function lowLevelSetStorage (dict) {
  const toStore = { extensionGlobalState: dict };
  debugStorage('lowLevelSetStorage toStore:', toStore);
  return new Promise ((resolve) => {
    chrome.storage.local.set(toStore, resolve);
  });
}

async function saveCurrentEndorsements (currentEndorsements) {
  debugStorage('-=-=-=-=-=-=-=-=-=-=-=-=-=-=- saveCurrentEndorsements : ', currentEndorsements);
  const toStore = { endorsementsGlobalState: currentEndorsements };
  await chrome.storage.local.set(toStore);
}

async function getCurrentEndorsements () {
  const endorsementsGlobalState = await chrome.storage.local.get('endorsementsGlobalState');
  const entries = Object.entries(endorsementsGlobalState);
  debugStorage('-=-=-=-=-=-=-=-=-=-=-=-=-=-=- getCurrentEndorsements : ', entries);
  return endorsementsGlobalState ? endorsementsGlobalState : {};
}


// Note Feb 15, 2023:  It is also possible to do this without async keywords
// chrome.storage.sync.get().then((all) => {
//   for (const [key, val] of Object.entries(all)) {
//     debugFgLog('======= voterDeviceId storage.sync ', key, val);
//     if (key === 'voterDeviceId') {
//       debugFgLog(`======= voterDeviceId storage.sync previous value of voterDeviceId: "${val}", new value: "${id}"`);
//       voterDeviceId = val;
//     }
//   }
//   chrome.storage.sync.set({'voterDeviceId': id}, () => {
//     if (chrome.runtime.lastError) {
//       console.error('chrome.storage.sync.set({\'voterDeviceId\': id}) returned error ', chrome.runtime.lastError.message);
//     }
//   });
// });

