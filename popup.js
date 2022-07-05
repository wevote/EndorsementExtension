/* global $, ballotWebAppURL */
// var onPageShown = false;
var debug = false;
let timeoutToCloseDialog = true;
const removeEditText = 'Remove Edit Panel From This Tab';
const openEditText = 'Open Edit Panel for this Tab';
const openEditTextConvertedPDF = 'Open Edit Panel for this PDF';
const highlightThisText = 'Highlight Candidates on This Tab';
const highlightThisPDF = 'Highlight Candidates found on this PDF';
const removeHighlightThisText = 'Remove Highlights From This Tab';
let pdfURL = null;
//let getBackgndPg = null;

/*
July 2022:  Manifest V3 (API V3)
Do not use chrome.runtime.getBackgroundPage() or chrome.runtime.sendMessage() from the pop up anymore, will silently crash it
*/

// When popup.html is loaded by clicking on the W icon as specified in th manifest.json
document.addEventListener('DOMContentLoaded', function () {
  console.log('hello from popup');
  const t0 = performance.now();
  let highlightingEnabled = false;
  // The DOM is loaded, now get the active tab number
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function (tabs) {
    const tab = tabs[0];
    const tabId = tab.id;
    console.log('hello from after tabs query tabId', tabId);
    chrome.tabs.sendMessage(tabId, {
      command: 'logFromPopup',
      payload: 'Initial message after getting tab id'
    }, function (response) {
      console.log('logFromPopup: ', response);
    });
    console.log('after first log response', tabId);
    addButtonListeners(tabId);
    console.log('after addButtonListeners', tabId);

    chrome.tabs.query({currentWindow: true}, (tabs) => {
      const tabsList = document.createElement('ul');

      for (let tab of tabs) {
        console.log('Tab ID: ', tab.id, ' url: ', tab.title);
        const listItem = document.createElement('li');
        listItem.innerText = tab.id + ' - ' + tab.title;
        tabsList.append(listItem);
      }

      document.body.append(tabsList);
    });
  });

  function updateButtonState (tabId) {
    chrome.tabs.sendMessage(tabId, {
      command: 'getStatusForActiveTab',
    }, (status) => {
      if (chrome.runtime.lastError) {
        console.log(' chrome.tabs.sendMessage(getStatusForActiveTab)', chrome.runtime.lastError.message);
      }
      const { showHighlights: highlighterEnabledThisTab, showEditor: highlighterEditorEnabled, orgName, weVoteId: organizationWeVoteId,
        twitterHandle: organizationTwitterHandle, encodedHref} = status;
      console.log('status mmmmmmmmmmmmm ', status);

      const isPDF = encodedHref && encodedHref.toLowerCase().endsWith('.pdf');
      if (isPDF) {
        pdfURL = encodedHref;
      }
      if (highlighterEnabledThisTab) {
        $('#highlightCandidatesThisTabButton').addClass('weButtonRemove').removeClass('wePDF').text(removeHighlightThisText);
      } else if(isPDF) {
        $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').addClass('wePDF').text(highlightThisPDF);
      } else {
        $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').text(highlightThisText);
      }

      if (highlighterEditorEnabled) {
        $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);
      } else if(isPDF) {
        $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditTextConvertedPDF);
      } else {
        $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);
      }

      if (organizationWeVoteId || organizationTwitterHandle) {
        const url = organizationTwitterHandle ? 'https://wevote.us/' + organizationTwitterHandle : 'https://wevote.us/voterguide/' + organizationWeVoteId;
        $('#allEndorsementsButton').
          text(orgName && orgName.length ? 'ENDORSEMENTS: ' + orgName.toUpperCase() : 'ENDORSEMENTS').
          prop('disabled', false).
          removeClass('weButtonDisable').
          click(() => window.open(url, '_blank'));
      } else {
        $('#allEndorsementsButton').
          text('ENDORSEMENTS' + orgName.toUpperCase()).
          prop('disabled', true).
          addClass('weButtonDisable').
          unbind();
      }
    });
  }

  function addButtonListeners (tabId) {
    $('#highlightCandidatesThisTabButton').click(() => {
      // chrome.tabs.query({active: true, currentWindow: true}, function (tabs){
      console.log('addButtonListeners highlightCandidatesThisTabButton click tabId', tabId);

      chrome.tabs.sendMessage(tabId, {
        command: 'updateForegroundForButtonChange',
        payload: {
          highlightThisTab: true,
          openEditPanel: false,
          pdfURL: ''
        }
      }, function (response) {
        console.log('updateBackgroundForButtonChange: ', response);
      });

      console.log('---------chrome.runtime.getBackgroundPage()-------', tabId);

      // chrome.tabs.sendMessage(tabId, {
      //   command: 'getTabStatusValues',
      // }, (status) => {
      //   if (chrome.runtime.lastError) {
      //     console.log(' chrome.tabs.sendMessage(getTabStatusValues)', chrome.runtime.lastError.message);
      //   }
      //   const { showHighlights: highlighterEnabledThisTab, showEditor: highlighterEditorEnabled, orgName, weVoteId: organizationWeVoteId,
      //     twitterHandle: organizationTwitterHandle, encodedHref} = status;
      //   console.log('status hhhhhhhhhhhh ', status);
      // });

      updateButtonState (tabId);  // HACK TO TEST

      chrome.storage.local.set({steve: 'podell'}, function() {    // HACK TO TEST
        console.log('Value is set to podell');
      });

      chrome.tabs.sendMessage(tabId, {
        command: 'logFromPopup',
        payload: 'highlightCandidatesThisTabButton'
      }, function (response) {
        console.log('logFromPopup: ', response);
      });
    });
  }
});

