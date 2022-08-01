/* global $, ballotWebAppURL */

// Debug settings
const closeDialogAfterTimeout = false;
const showTabAndWindowInPopup = true;
// Other constants and variables
const removeEditText = 'Remove Edit Panel From This Tab';
const openEditText = 'Open Edit Panel for this Tab';
const openEditTextConvertedPDF = 'Open Edit Panel for this PDF';
const highlightThisText = 'Highlight Candidates on This Tab';
const highlightThisPDF = 'Highlight Candidates found on this PDF';
const removeHighlightThisText = 'Remove Highlights From This Tab';
let pdfURL = null;
let mostRecentState = null;

const initialExtensionState = {
  isEnabled: false,
  showPanel: false,
  showHighlights: false,
  tabId: 0,
  windowId: 0,
  url: '',
  lastStateChange: 0,
  organizationName: '',
  organizationWeVoteId: 0,
  organizationTwitterHandle: '',
};

/*
July 2022:  Manifest V3 (API V3)
Do not use chrome.runtime.getBackgroundPage() or chrome.runtime.sendMessage() from the pop up anymore, will silently crash it
*/

// When popup.html is loaded by clicking on the W icon as specified in the manifest.json
document.addEventListener('DOMContentLoaded', function () {
  console.log('hello from popup');
  if (!mostRecentState) {
    mostRecentState = {...initialExtensionState};
  }
  // The DOM is loaded, now get the active tab number
  const { chrome } = window;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const [tab] = tabs;
    const { id: tabId, windowId, url } = tab;
    console.log('hello from after tabs query tab tabId', tabId, tab);
    chrome.tabs.sendMessage(tabId, {
      command: 'logFromPopup',
      payload: 'Initial message after getting active tabId: ' + tabId,
    }, function (response) {
      console.log('logFromPopup: ', response);
    });
    console.log('after first log response', tabId);
    addButtonListeners(tabId, url);
    console.log('after addButtonListeners', tabId);

    getStoredState().then((extState) => {
      console.log('extState =============', extState);
      console.log('extState: ' + extState.tabId + ' ->' +  tabId + ' :: ' +
            extState.windowId + ' ->' +  windowId + ' :: ' +
            extState.url + ' ->' +  url);
      const lastDate = new Date(extState.lastStateChange);
      const lastPlus12 = lastDate.setHours(lastDate.getHours() + 12);
      if ($.isEmptyObject(extState)) {
        extState = {...initialExtensionState};  // to prevent exception on first load
      }
      if (extState.tabId !== tabId ||
          extState.windowId !== windowId ||
          extState.url !== url ||
          lastPlus12 < Date.now()
      ) {
        console.log('RESETTING STORAGE DUE TO TAB CHANGE OR OUTDATED STORAGE');
        console.log('extState: ' + extState.tabId + ' ->' +  tabId + ' :: ' +
          extState.windowId + ' ->' +  windowId + ' :: ' +
          extState.url + ' ->' +  url);
        extState = {...initialExtensionState};
        extState.lastStateChange = Date.now();
        extState.tabId = tabId;
        extState.windowId = windowId;
        extState.url = url;
        mostRecentState = {...extState};
        setStoredState(extState);
        chrome.action.setBadgeText({ text: '' });
      } else {
        console.log('PRESERVING STORAGE ON POPUP OPEN');
      }

      updateButtonState();

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
  });

  function updateButtonState () {
    const isPDF = mostRecentState.url.toLowerCase().endsWith('.pdf');
    if (isPDF) {
      pdfURL = mostRecentState.url;
    }
    if (mostRecentState.showHighlights) {
      $('#highlightCandidatesThisTabButton').addClass('weButtonRemove').removeClass('wePDF').text(removeHighlightThisText);
    } else if(isPDF) {
      $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').addClass('wePDF').text(highlightThisPDF);
    } else {
      $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').text(highlightThisText);
    }

    if (mostRecentState.showPanel) {
      $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);
    } else if(isPDF) {
      $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditTextConvertedPDF);
    } else {
      $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);
    }

    getStoredState().then((extState) => {
      const {
        organizationName,
        organizationWeVoteId,
        organizationTwitterHandle
      } = extState;
      if (organizationWeVoteId || organizationTwitterHandle) {
        const urlWebApp = organizationTwitterHandle
          ? 'https://wevote.us/' + organizationTwitterHandle
          : 'https://wevote.us/voterguide/' + organizationWeVoteId;
        $('#allEndorsementsButton').
          text(organizationName && organizationName.length
            ? 'ENDORSEMENTS: ' + organizationName.toUpperCase()
            : 'ENDORSEMENTS').
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
    });
  }

  function addButtonListeners (tabId, url) {
    // Highlight Candidates on This Tab
    $('#highlightCandidatesThisTabButton').click(() => {
      console.log('addButtonListeners highlightCandidatesThisTabButton click tabId', tabId);

      mostRecentState.showPanel = false;
      mostRecentState.showHighlights = !mostRecentState.showHighlights;
      if (mostRecentState.showHighlights) {
        $('#highlightingMasterSwitch').prop('checked', true);
      }
      setStoredState(mostRecentState);

      chrome.tabs.sendMessage(tabId, {
        command: 'updateForegroundForButtonChange',
        payload: {
          showHighlights: mostRecentState.showHighlights,
          openEditPanel: mostRecentState.showPanel,
          pdfURL: '',
          tabId: tabId,
          tabUrl: url,
        }
      }, function (response) {
        console.log('updateBackgroundForButtonChange: ', response);
      });
      updateButtonState();

      setTimeout(() => {
        closeDialogAfterTimeout && window.close();
        // getBackgroundPage().handleButtonStateChange (showHighlights, showEditor, pdfURL);
      }, 1000);
    });

    // Open Edit Panel For This Tab
    const openEditPanelButtonSelector = $('#openEditPanelButton');
    openEditPanelButtonSelector.click(() => {
      console.log('openEditPanelButton button onClick -- popup.js');
      if (mostRecentState.showPanel) {
        $('#highlightingMasterSwitch').prop('checked', true);
      }

      if (mostRecentState.showPanel) {  // if pressing the button would do a remove...
        if (pdfURL) {
          openEditPanelButtonSelector.removeClass('weButtonRemove').text(openEditTextConvertedPDF);
        } else {
          openEditPanelButtonSelector.removeClass('weButtonRemove').text(openEditText);
        }

        mostRecentState.showPanel = false;
        mostRecentState.showHighlights = false;
      } else {
        $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);
        mostRecentState.showHighlights = true;
        mostRecentState.showPanel = true;
      }
      setStoredState(mostRecentState);
      chrome.tabs.sendMessage(tabId, {
        command: 'updateForegroundForButtonChange',
        payload: {
          showHighlights: mostRecentState.showHighlights,
          openEditPanel: mostRecentState.showPanel,
          pdfURL: '',
          tabId,
          tabUrl: url
        }
      }, function (response) {
        console.log('updateBackgroundForButtonChange: ', response);
      });
      updateButtonState();

      setTimeout(() => {
        closeDialogAfterTimeout && window.close();
      }, 1000);
    });

    $('#jumpToMyBallot').click(() => {
      window.open(ballotWebAppURL, '_blank');
    });

  }
});
