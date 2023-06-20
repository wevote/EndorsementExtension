/* global chrome, $ */
/* eslint-disable no-undef */

// Debug settings
const closeDialogAfterTimeout = true;
const showTabAndWindowInPopup = true;
// Other constants and variables
const removeEditText = 'Remove Edit Panel From This Tab';
const openEditText = 'Open Edit Panel for this Tab';
const openEditTextConvertedPDF = 'Open Edit Panel for this PDF';
const highlightThisText = 'Highlight Candidates on This Tab';
const highlightThisPDF = 'Highlight Candidates found on this PDF';
const removeHighlightThisText = 'Remove Highlights From This Tab';
let pdfURL = null;

/*
Jan 2023:  We have converted the extension to use Chrome Extension Manifest V3 (API V3)
WE NO LONGER CAN USE chrome.runtime.getBackgroundPage() or chrome.runtime.sendMessage() -- The V3 Chrome documentation is incorrect and outdated, and these no longer work
*/

// When popup.html is loaded by clicking on the WeVote "W" icon as specified in the manifest.json
document.addEventListener('DOMContentLoaded', function () {
  const {
    chrome: {
      tabs: {
        sendMessage,
        lastError,
        query
      },
      action: {setBadgeText}
    }
  } = window;
  console.log('hello from popup');

  // The DOM is loaded, now get the active tab number
  query({
    active: true,
    currentWindow: true
  }, async function (tabs) {
    const [tab] = tabs;
    const {
      id: tabId,
      windowId,
      url
    } = tab;
    console.log('hello from after tabs query tab tabId', tabId, tab);
    sendMessage(tabId, {
      command: 'logFromPopup',
      payload: 'Initial message after getting active tabId: ' + tabId,
    }, function (response) {
      let myError = chrome.tabs.lastError;  // null or Error object, 4/29/23 Painfully discovered barely documented magic code, do not simplify
      if (myError) {
        console.log('hello from after tabs query myError: ', myError.message);
      }
      console.log('logFromPopup: ', response);
    });
    console.log('after first log response', tabId);
    addButtonListeners(tabId, url);
    console.log('after addButtonListeners', tabId);

    const state = await getGlobalState();
    console.log('state: ' + state.tabId + ' ->' + tabId + ' :: ' +
      state.windowId + ' ->' + windowId + ' :: ' +
      state.url + ' ->' + url);
    const lastDate = new Date(state.lastStateChange);
    const lastPlus12 = lastDate.setHours(lastDate.getHours() + 12);
    if (state.tabId !== tabId || /* state.windowId !== windowId ||*/ state.url !== url || lastPlus12 < Date.now()) {
      console.log('RESETTING STORAGE DUE TO TAB CHANGE OR OUTDATED STORAGE ', state.tabId, tabId, state.windowId, windowId, state.url, url, lastPlus12, Date.now());
      await reInitializeGlobalState();
      let isFromPDF = false;
      if (url && url.length > 5) {
        isFromPDF = url.toLowerCase().endsWith('.pdf');
      }
      await updateGlobalState({
        tabId: tabId,
        windowId: windowId,
        url: url,
        isFromPDF: isFromPDF,
        lastStateChange: Date.now(),
      });
      debugStorage('reinitialized state tabId: ' + tabId + ', windowId ' + windowId + ', url: ' + url);
      logFromPopup (tabId, '--------------- reinitialized state tabId: ' + tabId + ', windowId ' + windowId + ', url: ' + url);
      chrome.action.setBadgeText({text: ''});
    } else {
      debugStorage('PRESERVING STORAGE ON POPUP OPEN');
    }
    await updateButtonDisplayedState();

    $('#tabNumber').text(tabId.toString());
    const bits = url.split('/');
    let u = url;
    if (bits.length > 4) {
      u = bits[2] + ' /' + bits[3];
    }
    if (bits.length > 5) {
      u += '/' + bits[4];
    }
    if (showTabAndWindowInPopup) {
      $('#windowNumber').text(windowId.toString());
      $('#hostName').text(u);
    } else {
      $('.tabReportDiv').attr('hidden', true);
    }
  });

  async function updateButtonDisplayedState () {
    const state = await getGlobalState();
    const {
      organizationName,
      organizationWeVoteId,
      organizationTwitterHandle,
      url,
      showHighlights,
      showPanels
    } = state;
    const isPDF = url.toLowerCase().endsWith('.pdf');
    if (isPDF) {
      pdfURL = url;
      if (!state.voterIsSignedIn) {
        $('.notLoggedInWarning').css('display', 'unset');
        $('#highlightCandidatesThisTabButton').css('display', 'none');
        $('#openEditPanelButton').css('display', 'none');
        return;
      }
    }
    if (showHighlights) {
      $('#highlightCandidatesThisTabButton').addClass('weButtonRemove').removeClass('wePDF').text(removeHighlightThisText);
    } else if (isPDF) {
      $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').addClass('wePDF').text(highlightThisPDF);
    } else {
      $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').text(highlightThisText);
    }

    if (showPanels) {
      $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);
    } else if (isPDF) {
      $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditTextConvertedPDF);
    } else {
      $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);
    }

    if (organizationWeVoteId || organizationTwitterHandle) {
      const urlWebApp = organizationTwitterHandle ? 'https://wevote.us/' + organizationTwitterHandle : 'https://wevote.us/voterguide/' + organizationWeVoteId;
      $('#allEndorsementsButton').
        text(organizationName && organizationName.length ? 'Endorsements:   ' + organizationName : 'Endorsements').
        prop('disabled', false).
        removeClass('weButtonDisable').
        click(() => window.open(urlWebApp, '_blank'));
    } else {
      const orgName = organizationName ? organizationName.toUpperCase() : '';
      $('#allEndorsementsButton').
        text('ENDORSEMENTS' + orgName).
        prop('disabled', true).
        addClass('weButtonDisable').
        unbind();
    }
  }

  function addButtonListeners(tabId, url) {
    // Reset the highlighted tab
    $('#resetThisTabButton').click(() => {
      console.log('addButtonListeners resetThisTabButton hardResetActiveTab click tabId', tabId);
      console.log('hardResetActiveTab popup.js location: ', location);
      logFromPopup (tabId, 'sending hardResetActiveTab');
      sendMessage(tabId, {
        command: 'hardResetActiveTab',
        payload: {
          tabUrl: url,
        }
      }, async function () {
        console.log(lastError ? `resetThisTabButton lastError ${lastError.message}` : 'resetThisTabButton returned');
        const state = await reInitializeGlobalState();
        debugStorage('#resetThisTabButton response state:', state);
        // const state = await getGlobalState();
        await updateButtonDisplayedState();
        setBadgeText({text: ''});
      });
    });

    // Highlight Candidates on This Tab
    $('#highlightCandidatesThisTabButton').click(async () => {
      console.log('addButtonListeners highlightCandidatesThisTabButton click tabId', tabId);
      console.log('getGlobalState in popup 137');
      let state = await getGlobalState();
      const showHighlights = !state.showHighlights;
      const showPanels = false;
      const isFromPDF = pdfURL && pdfURL.length > 0;

      if (showHighlights) {
        // $('#highlightingMasterSwitch').prop('checked', true);
        await updateGlobalState({
          showPanels: showPanels,
          showHighlights: showHighlights,
          tabId: tabId,
          // highlighterEnabledThisTab: true,  // TODO: Remove this vestigial leftover from multiple highlighted tabs version
        });
      } else {
        await reInitializeGlobalState();
      }
      // if (state.showHighlights) {
      //   $('#highlightingMasterSwitch').prop('checked', true);
      // }
      logFromPopup (tabId, 'sending updateForegroundForButtonChange');
      sendMessage(tabId, {
        command: 'updateForegroundForButtonChange',
        payload: {
          isFromPDF,
          showPanels,
          pdfURL,
          showHighlights,
          tabId,
          tabUrl: url,
        }
      }, function (lastError) {
        if (lastError) {
          console.log('updateForegroundForButtonChange 1 lastError', lastError.message);
        }
        console.log('updateForegroundForButtonChange: ', lastError);
      });
      await updateButtonDisplayedState();

      setTimeout(() => {
        closeDialogAfterTimeout && window.close();
      }, 1000);
    });

    // Open Edit Panel For This Tab
    const openEditPanelButtonSelector = $('#openEditPanelButton');
    openEditPanelButtonSelector.click(async () => {
      console.log('openEditPanelButton button onClick -- popup.js');
      console.log('getGlobalState in popup 179');
      let showPanels = false;
      let showHighlights = false;
      let newTabId = tabId;
      const isFromPDF = pdfURL && pdfURL.length > 0;

      let state = await getGlobalState();
      if (state.showPanels) {  // if pressing the button would do a remove...
        newTabId = -1;
        if (pdfURL) {
          openEditPanelButtonSelector.removeClass('weButtonRemove').text(openEditTextConvertedPDF);
        } else {
          openEditPanelButtonSelector.removeClass('weButtonRemove').text(openEditText);
        }
      } else {
        $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);  // Change button label
        showHighlights = true;
        showPanels = true;
      }
      await updateGlobalState({
        isFromPDF: isFromPDF,
        pdfURL: pdfURL,
        showPanels: showPanels,
        showHighlights: showHighlights,
        tabId: newTabId,
      });

      logFromPopup (tabId, 'sending updateForegroundForButtonChange');
      sendMessage(tabId, {
        command: 'updateForegroundForButtonChange',
        payload: {
          isFromPDF,
          showPanels,
          pdfURL,
          showHighlights,
          tabId,
          tabUrl: url
        }
      });
      await updateButtonDisplayedState();

      setTimeout(() => {
        closeDialogAfterTimeout && window.close();
      }, 1000);
    });

    // $('#jumpToMyBallot').click(() => {
    //   window.open(ballotWebAppURL, '_blank');
    // });
  }

  function logFromPopup (tabId, message) {
    if (debugPopUpMessages) {
      sendMessage(tabId, {
        command: 'logFromPopup',
        payload: message,
      });
    }
  }
});
