/* global $, ballotWebAppURL */
// var onPageShown = false;
var debug = false;
const {chrome: {extension: { getBackgroundPage } } } = window;
let timeoutToCloseDialog = true;
const removeEditText = 'Remove Edit Panel From This Tab';
const openEditText = 'Open Edit Panel for this Tab';
const openEditTextConvertedPDF = 'Open Edit Panel for this PDF';
const highlightThisText = 'Highlight Candidates on This Tab';
const highlightThisPDF = 'Highlight Candidates found on this PDF';
const removeHighlightThisText = 'Remove Highlights From This Tab';
let pdfURL = null;


// When popup.html is loaded by clicking on the W icon as specified in th manifest.json
document.addEventListener('DOMContentLoaded', function () {
  const t0 = performance.now();
  let highlightingEnabled = false;
  let highlightCandidatesOnAllTabs = localStorage['highlightCandidatesOnAllTabs'] === 'true';
  if (highlightCandidatesOnAllTabs) getBackgroundPage().highlighterEnabled = true;

  console.log('chrome.extension.getBackgroundPage().highlighterEnabled: ' + getBackgroundPage().highlighterEnabled);
  getBackgroundPage().popupLogger('>>>>>>>> chrome.extension.getBackgroundPage().highlighterEnabled: ' + getBackgroundPage().highlighterEnabled);
  // console.log('localStorage[\'highlightCandidatesOnThisTab\']', localStorage['highlightCandidatesOnThisTab']);
  console.log('localStorage[\'highlightCandidatesOnAllTabs\']', localStorage['highlightCandidatesOnAllTabs']);
  if (getBackgroundPage().highlighterEnabled === undefined) {
    getBackgroundPage().highlighterEnabled = false;
    localStorage['highlightCandidatesOnAllTabs'] = 'false';
  } else {
    highlightingEnabled = getBackgroundPage().highlighterEnabled;
    highlightCandidatesOnAllTabs = localStorage['highlightCandidatesOnAllTabs'] === 'true';
  }

  updateButtonState();

  // Master switch "Enable Highlighting"
  $('#highlightingMasterSwitch').prop('checked', highlightingEnabled).click(() => {
    // We are turning off or turning on we want to reset the two bottom buttons
    $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').text(highlightThisText);
    $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);

    // If after the click the switch is now checked (flipped to right)...
    if ($('#highlightingMasterSwitch').is(':checked')) {
      getBackgroundPage().highlighterEnabled = true;
    } else {
      getBackgroundPage().highlighterEnabled = false;

      localStorage['highlightCandidatesOnAllTabs'] = 'false';
      $('#highlightCandidatesOnAllTabsSwitch').prop('checked', false);
    }
    event.timer = setTimeout(() => {
      timeoutToCloseDialog && window.close();
      if (!getBackgroundPage().highlighterEnabled) {
        getBackgroundPage().removeHighlightsForAllTabs();
      }
    }, 2000);
  });

  $('#highlightCandidatesOnAllTabsSwitch').prop('checked', highlightCandidatesOnAllTabs).click(() => {
    event.timer = setTimeout(() => {
      timeoutToCloseDialog && window.close();
    }, 2000);
    window.close();
    if ($('#highlightCandidatesOnAllTabsSwitch').is(':checked')) {
      $('#highlightingMasterSwitch').prop('checked', true);
      localStorage['highlightCandidatesOnAllTabs'] = 'true';
      getBackgroundPage().highlighterEnabled = true;
      getBackgroundPage().enableHighlightsForAllTabs(true);
    } else {
      localStorage['highlightCandidatesOnAllTabs'] = 'false';
      getBackgroundPage().highlighterEnabled = false;
      getBackgroundPage().enableHighlightsForAllTabs(false);
    }
  });

  let showHighlights = false;
  $('#highlightCandidatesThisTabButton').click((event) => {
    debug && getBackgroundPage().dumpTabStatus();

    getBackgroundPage().highlighterEnabled = true;
    $('#highlightingMasterSwitch').prop('checked', true);

    if ($('#highlightCandidatesThisTabButton').hasClass('weButtonRemove')) {  // if pressing the button would do a remove...
      showHighlights = false;
      if (pdfURL) {
        $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').text(highlightThisText);
      } else {
        $('#highlightCandidatesThisTabButton').removeClass('weButtonRemove').addClass('wePDF').text(highlightThisPDF);
      }
    } else {                                                                  // If pressing the button would add the highlights
      showHighlights = true;
      $('#highlightCandidatesThisTabButton').addClass('weButtonRemove').removeClass('wePDF').text(removeHighlightThisText);
    }

    event.timer = setTimeout(() => {
      timeoutToCloseDialog && window.close();
      getBackgroundPage().handleButtonStateChange (showHighlights, showEditor, pdfURL);
    }, 1000);
  });

  let showEditor = false;
  $('#openEditPanelButton').click((event) => {
    getBackgroundPage().highlighterEnabled = true;
    console.log('openEditPanelButton button onClick -- popup.js');
    $('#highlightingMasterSwitch').prop('checked', true);

    if ($('#openEditPanelButton').hasClass('weButtonRemove')) {  // if pressing the button would do a remove...
      if (pdfURL) {
        $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditTextConvertedPDF);
      } else {
        $('#openEditPanelButton').removeClass('weButtonRemove').text(openEditText);
      }

      showEditor = false;
    } else {
      $('#openEditPanelButton').addClass('weButtonRemove').text(removeEditText);
      showEditor = true;
      showHighlights = true;
    }
    event.timer = setTimeout(() => {
      timeoutToCloseDialog && window.close();
      getBackgroundPage().handleButtonStateChange (showHighlights, showEditor, pdfURL);
    }, 1000);
  });

  $('#jumpToMyBallot').click(() => {
    window.open(ballotWebAppURL, '_blank');
  });
  const t1 = performance.now();
  timingLog(t0, t1, 'process popoup.html in popup.js took', 4.0);
  updateButtonState();
  getBackgroundPage().popupMenuTiming(t0, t1, 'process popoup.html in popup.js took', 4.0);
});

function updateButtonState () {
  const { chrome: { tabs: { query } } } = window;
  debug && getBackgroundPage().dumpTabStatus();

  query({active: true, currentWindow: true}, function (tabs) {
    const url = tabs && tabs[0] ? tabs[0].url : '';
    const tabId = tabs && tabs[0] ? tabs[0].id : -1;
    const status = getBackgroundPage().getStatusForActiveTab(tabId, url);
    const logLine = '>>>>>>>> updateButtonState called for tab: ' + tabId + ', url:' + url;
    console.log(logLine);
    debug && getBackgroundPage().popupLogger(logLine);
    const { showHighlights: highlighterEnabledThisTab, showEditor: highlighterEditorEnabled, orgName, weVoteId: organizationWeVoteId,
      twitterHandle: organizationTwitterHandle, encodedHref} = status;
    debug && getBackgroundPage().popupLogger('>>>>>>>> updateButtonState getStatusForActiveTab: ' + tabId + ', highlighterEnabledThisTab:' + highlighterEnabledThisTab +
      ', highlighterEditorEnabled:' + highlighterEditorEnabled + ', orgName:' + orgName + ', organizationTwitterHandle:' + organizationTwitterHandle);
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


// function clearHighlightsFromTab () {
//   chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
//     debug&&('clearing highlights from tab');
//     chrome.tabs.sendMessage(tabs[0].id, {command: 'ClearHighlights'});
//   });
// }
//
// function onOff () {
//   if (chrome.extension.getBackgroundPage().highlighterEnabled) {
//     chrome.extension.getBackgroundPage().highlighterEnabled = false;
//   }
//   else {
//     chrome.extension.getBackgroundPage().highlighterEnabled = true;
//   }
//   renderOnOff();
// }
//
// function renderOnOff () {
//   document.getElementById('myonoffswitch').checked = chrome.extension.getBackgroundPage().highlighterEnabled;
//   if (!chrome.extension.getBackgroundPage().highlighterEnabled) {
//     document.getElementById('header').style.backgroundColor = 'grey';
//   }
//   else {
//     document.getElementById('offDesc').innerHTML = '';
//     document.getElementById('header').style.backgroundColor = '#0091EA';
//   }
// }

// function hintNonUnicodeChar (value){
//   if(value.match(/[^a-zA-Z0-9_\s]/)){
//     document.getElementById('hintNonUnicode').style.display='block';
//   }
//   else{
//     document.getElementById('hintNonUnicode').style.display='none';
//   }
// }

// function onPage () {
//   onPageShown = true;
//   if (chrome.extension.getBackgroundPage().showFoundWords) {
//     chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
//       debug && console.log("active tabs",tabs);
//       chrome.tabs.sendMessage(tabs[0].id, {command: "getMarkers"}, function (result) {
//         debug && console.log("got markers",result);
//
//         if (result == undefined) {
//           //on a chrome page
//           drawInterface();
//         }
//         else if (result[0] != undefined) {
//           document.getElementById("menu").style.display = "none";
//           document.getElementById("onPage").style.display = "block";
//           chrome.runtime.getPlatformInfo(
//             function (i) {
//
//               if (i.os == "mac") {
//                 document.getElementById("OSKey").innerHTML = "Command";
//               }
//               else {
//                 document.getElementById("OSKey").innerHTML = "Control";
//               }
//             });
//           renderFoundWords(result);
//         }
//         else {
//           drawInterface();
//         }
//       });
//     });
//   }
//   else {
//
//   drawInterface();
// }
