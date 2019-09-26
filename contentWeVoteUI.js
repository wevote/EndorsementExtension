const { $, chrome: { runtime } } = window;
let voterGuidePossibilityIdGlobal = '';
let organizationWeVoteIdGlobal = '';
let unfurledCandidateNameGlobal = '';
const defaultImage = 'https://raw.githubusercontent.com/wevote/EndorsementExtension/develop/icon48.png';

/**
 * Display (or remove) the we vote extension UI
 * @param {boolean} enabled - true to display the UI, false to remove it
 * @returns {boolean} - return true to indicate that we call the response function asynchronously
 */
function displayWeVoteUI (enabled) {  // eslint-disable-line no-unused-vars
  try {
    if(enabled) {
      console.log('Displaying WeVote UI --------------------------------');
      getHighlights(true);   // Calls BuildUI when the API query completes
    } else {
      // Disable UI (reload the page)
      console.log('Unloading WeVote UI --------------------------------');
      location.reload();
    }
  } catch (err) {
    console.log('jQuery dialog in contentWeVoteUI threw: ', err);
  }
  return true;  // indicates that we call the response function asynchronously.  https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
}

function buildUI () {
  console.log('Building WeVote UI --------------------------------');
  let hr = window.location.href;
  let topMenuHeight = 75;
  let sideAreaWidth = 400;
  let iFrameHeight = window.innerHeight - topMenuHeight;
  let iFrameWidth = window.innerWidth - sideAreaWidth;
  let bod = $('body');
  $(bod).children().wrapAll("<div id='weTrash' >").hide();  // if you remove it, other js goes nuts
  $(bod).children().wrapAll("<div id='weContainer' >");  // Ends up before weTrash
  $('#weTrash').insertAfter('#weContainer');

  let weContainer = $('#weContainer');
  $(weContainer).append('' +
    "<span id='topMenu'>" +
    '</span>').append("<div id='weFlexGrid' ></div>");

  let weFlexGrid = $('#weFlexGrid');
  $(weFlexGrid).append('<aside id="frameDiv"><iframe id="frame" width=' + iFrameWidth + ' height=' + iFrameHeight + '></iframe></aside>');
  $(weFlexGrid).append('<section id="sideArea"></section>');

  $('#frame').attr('src', hr);

  topMenu();
  updateTopMenu();
  signIn(false);

  greyAllPositionPanes(false);
}

function debugLog (...args) {
  const {debugLocal} = window;
  if (debugLocal) {
    console.log(...args);
  }
}

function debugWarn (...args) {
  const {debugLocal} = window;
  if (debugLocal) {
    console.log(...args);
  }
}

/*
  May 16, 2019
   For now if the API server is swapped local/production you will need to get a new device ID.
  With the extension running, go to the wevote.us or localhost:3000 page, and open the popup, and press the login button.
  Then when you navigate to some endorsement page. the device id will become available in local storage.
  Sept 10, 2019, you may have to clear localStorage['voterDeviceId'].  You will have to be running a local webapp, which
  is pointed to a local python server, so that they all share a voterDeviceId.  If you have had a valid voterDeviceId
  in the past, you can get the most recent one form pgAdmin/voter_voterdevicelink and paste it into the value for
  voterDeviceId in the chrome-extension's DevTools Application tab.
 */

function signIn (showDialog) {
  debugLog('new signIn');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getVoterInfo',},
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getVoterInfo")', lastError.message);
      }
      const { success, error, err, voterName, photoURL, voterWeVoteId, voterEmail } = response.data;
      debugLog('signIn response: ', response);
      let voterInfo = {
        success: success,
        error: error,
        err: err,
        name: voterName,
        photo: photoURL,
        voterId: voterWeVoteId,
        email: voterEmail
      };

      if (voterInfo.success) {
        $('#signIn').replaceWith(
          "<img id='signOut' class='voterPhoto noStyleWe' alt='candidate' width='35' height='35' src='" + voterInfo.photo + "' style='margin: 12px;'  />");
        updatePositionsPanel();
        document.getElementById('signOut').addEventListener('click', function () {
          debugLog('Sign Out pressed');
          $('#furlable-2').removeAttr('hidden');
          signOut();
          return false;
        });
      } else {
        console.error('signIn() getVoterInfo returned error: ' + voterInfo.error + ', err: ' + voterInfo.err);
        if (showDialog) {
          $('#loginPopUp').dialog({
            dialogClass: 'no-close',
            width: 500,
            position: { my: 'right top', at: 'left bottom', of: '#signIn' },
            open: function () {
              const markup = "<div style='text-align: center;'><b>Authenticate this \"We Vote Endorsement Tool\" Chrome extension,</b><br>" +
                ' by logging into the We Vote WebApp (https://wevote.us) in another tab.<br><br>' +
                'Once you have logged into the We Vote Web App, ' +
                'navigate back to this tab and press the <b>SIGN IN</b> button again to authenticate the "We Vote Endorsement Tool" Chrome Extension.</div>';
              $(this).html(markup);
            },
          });
        }
      }
    });
  return false;
}

function signOut () {
  console.log('signOut has not been implemented.');
}

function topMenu () {
  let topMarkup = '' +
    "<div style='margin-left:12px; margin-bottom:4px; align-content: center; width: 10%'>" +
    "  <img id='orgLogo' src='https://raw.githubusercontent.com/wevote/EndorsementExtension/develop/icon48.png' alt=''>" +
    "  <b><span id='orgName'></span></b>" +
    '</div>' +
    "<input type='text' id='email' name='email' placeholder='Email' >" +
    "<input type='text' id='topComment' name='topComment' placeholder='Comment here... (for unauthenticated suggestions)' >" +
    "<div style='width: 100%; float: right'>" +
    "  <button type='button' id='signIn' class='signInButton weButton noStyleWe'>SIGN IN</button>" +
    '</div>' +
    "<span id='loginPopUp'></span>";
  $('#topMenu').append(topMarkup);

  document.getElementById('signIn').addEventListener('click', function () {
    debugLog('Sign in pressed');
    signIn(true);
    return false;
  });
}

// Get the href into the extension
function getHighlights (doBuildUI) {
  debugLog('getHighlights() called');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getHighlights', url: window.location.href, doReHighlight: false },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getHighlights")', lastError.message);
      }
      debugLog('getHighlights() response', response);

      if (response) {
        debugLog('SUCCESS: getHighlights received a response', response);
        if (doBuildUI) {
          buildUI();
        }
      } else {
        console.log('ERROR: getHighlights received empty response');
      }
    });
}

function getRefreshedHighlights () {
  debugLog('getRefreshedHighlights called');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getHighlights', url: window.location.href, doReHighlight: true },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getHighlights")', lastError.message);
      }
      console.log('getRefreshedHighlights() response', response);

      if (response) {
        debugLog('SUCCESS: getRefreshedHighlights received a response', response);
      } else {
        console.log('ERROR: getRefreshedHighlights received empty response');
      }
    });
}


// Call into the background script to do a voterGuidePossibilityRetrieve() api call, and return the data, then update the top menu
function updateTopMenu () {
  debugLog('updateTopMenu()');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getTopMenuData', url: window.location.href },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getTopMenuData")', lastError.message);
      }
      debugLog('updateTopMenu() response', response);

      if (response && Object.entries(response).length > 0) {
        const { orgName, orgLogo, possibilityId } = response.data;  // eslint-disable-line no-unused-vars

        $('#orgLogo').attr('src', orgLogo);
        $('#orgName').text(orgName ? orgName : 'An Organization has not been stored for this URL. ');
        $('#email').css('background', 'lightgrey').attr('disabled', true);      // The purpose of this field is to allow cloudsourced comments from un-authenticated, and untrusted public voters
        $('#topComment').css('background', 'lightgrey').attr('disabled', true); // Also for cloudsourced comments from un-authenticated, and untrusted public voters
        voterGuidePossibilityIdGlobal = possibilityId;
        debugLog('updateTopMenu voterGuidePossibilityIdGlobal: ' + voterGuidePossibilityIdGlobal);
        if (orgName === undefined) {
          rightNewGuideDialog();
        }
        updatePositionsPanel();
      } else {
        console.error('ERROR: updateTopMenu received empty response');
      }
    });
}

function updatePositionsPanel () {
  debugLog('updatePositionsPanel() getPositions');
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage({ command: 'getPositions', url: window.location.href, possibilityId: voterGuidePossibilityIdGlobal },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("getPositions")', lastError.message);
      }
      debugLog('updatePositionsPanel() response', response);
      if ((response && Object.entries(response).length > 0) && (response.data !== undefined) && (response.data.length > 0)) {
        let {data} = response;
        let l = data.length;
        let selector = $('#sideArea');
        if (l > 0) {
          for (let i = 0; i < l; i++) {
            debugLog('updatePositionsPanel data: ', data[i]);
            // be sure not to use position_stance_stored, statement_text_stored, or more_info_url_stored -- we want the possibilities, not the live data
            let { ballot_item_name: name, position_stance: stance, statement_text: comment, more_info_url: url,
              political_party: party, office_name: officeName, ballot_item_image_url_https_large: imageURL, candidate_we_vote_id: candidateWeVoteId,
              google_civic_election_id: googleCivicElectionId, office_we_vote_id: officeWeVoteId, organization_we_vote_id: organizationWeVoteId,
              possibility_position_id: possibilityPositionId, possibility_position_number: possibilityPositionNumber, organization_name: organizationName,
              voter_guide_possibility_id: voterGuidePossibilityId
            } = data[i];
            organizationWeVoteIdGlobal = organizationWeVoteId;

            let position = {
              name,
              party,
              office: officeName ? officeName : '',
              photo: (imageURL && imageURL.length > 0) ? imageURL : defaultImage,
              comment: (comment && comment.length) ? comment : '',
              stance,
              url: url ? url : '',
              candidateWeVoteId,
              googleCivicElectionId,
              officeWeVoteId,
              organizationWeVoteId,
              organizationName,
              possibilityPositionId,
              possibilityPositionNumber,
              voterGuidePossibilityId
            };
            rightPositionPanes(i, position, selector);
          }
        }
        attachClickHandlers();
      } else {
        console.error('ERROR: updatePositionsPanel() getPositions returned an empty response or no data element.')
      }
    }
  );
}

function rightPositionPanes (i, candidate, selector) {
  let dupe = $(".candidateName:contains('" + candidate.name + "')").length;
  debugLog('rightPositionPanes checked for duplicate ' + candidate.name + ': ' + dupe);
  let furlNo = 'furlable-' + i;
  let candNo = 'candidate-' + i;
  if (candidate.name === null || candidate.name.length === 0) {
    debugWarn('rightPositionPane rejected index: ' + i + ', possibilityPositionNumber: ' + candidate.possibilityPositionNumber +
      ', possibilityPositionNumber: ' + candidate.possibilityPositionNumber);
    return;
  }
  if (!dupe) {
    $(selector).append(candidatePaneMarkup(candNo, furlNo, i, candidate, false));
    $('.statementText-' + i).val(candidate.comment);
    $('.moreInfoURL-' + i).val(candidate.url);
    $(selector).css({
      'height': $('#frameDiv').height() + 'px',
      'overflow': 'scroll'
    });

  }
}

function candidatePaneMarkup (candNo, furlNo, i, candidate, detachedDialog) {
  let {party} = candidate;
  if (party === undefined) {
    party = (detachedDialog) ? 'Party: Not specified' :'No match for any current WeVote candidate.';
  }

  let markup =
    "<div class='candidate " + candNo + "'>" +
    "  <div id='unfurlable-" + i + "' class='unfurlable' >" +
    "    <span class='unfurlableTopMenu'>" +
    "      <img class='photo noStyleWe' alt='candidate' src=" + candidate.photo + ' />' +
    "      <div class='nameBox  noStyleWe'>" +
             (!detachedDialog ? ("<div class='candidateName'>" + candidate.name + '</div>') : ("<input type='text' class='candidateNameInput-" + i + "' />")) +
    "        <div class='candidateParty'>" + party + '</div>' +
    "        <div class='officeTitle'>" + candidate.office + '</div>' +
    '      </div>' +
    '    </span>' +
    "    <input type='hidden' id='candidateName-" + i + "' value='" + candidate.name + "'>" +
    "    <input type='hidden' id='candidateWeVoteId-" + i + "' value='" + candidate.candidateWeVoteId + "'>" +
    "    <input type='hidden' id='voterGuidePossibilityId-" + i + "' value='" + candidate.voterGuidePossibilityId + "'>" +
    "    <input type='hidden' id='possibilityPositionNumber-" + i + "' value='" + candidate.possibilityPositionNumber + "'>" +
    "    <input type='hidden' id='possibilityPositionId-" + i + "' value='" + candidate.possibilityPositionId + "'>" +
    "    <input type='hidden' id='organizationWeVoteId-" + i + "' value='" + candidate.organizationWeVoteId + "'>" +
    "    <input type='hidden' id='organizationName-" + i + "' value='" + candidate.organizationName + "'>" +
    "    <input type='hidden' id='candidateWeVoteId-" + i + "' value='" + candidate.candidateWeVoteId + "'>" +
    "    <input type='hidden' id='googleCivicElectionId-" + i + "' value='" + candidate.googleCivicElectionId + "'>" +
    '  </div>' +
    '  <div id= ' + furlNo + " class='furlable' " + (detachedDialog ? '' : 'hidden') + '>' +
    "    <span class='buttons'>" +
           supportButton(i, 'endorse', candidate.stance) +
           supportButton(i, 'oppose', candidate.stance) +
           supportButton(i, 'info', candidate.stance) +
    '    </span>' +
    "    <textarea rows='6' class='statementText-" + i + "' />" +
    '    <br>If a more detailed endorsement page exists, enter its URL here:' +
    "    <input type='text' class='moreInfoURL-" + i + "' />" +
    "    <span class='buttons'>";
  if (!detachedDialog) {
    markup += " <button type='button bottomButtons' class='revealLeft-" + i + " weButton ui-button ui-widget ui-corner-all noStyleWe'>Reveal</button>";
  }
  markup += "   <button type='button bottomButtons' class='openInAdminApp-" + i + " weButton ui-button ui-widget ui-corner-all noStyleWe'>Admin App</button>";
  if (candidate.party !== undefined) {
    markup += " <button type='button bottomButtons' class='openInWebApp-" + i + " weButton ui-button ui-widget ui-corner-all noStyleWe'>Web App</button>";
  }
  markup += "   <button type='button bottomButtons' class='saveButton-" + i + " weButton ui-button ui-widget ui-corner-all noStyleWe'>Save</button>" +
    '    </span>' +
    '  </div>' +
    '</div>';
  return markup;
}

function greyAllPositionPanes (booleanGreyIt) {
  if (booleanGreyIt) {
    $('div.candidate').css('opacity', '0.25');
  } else {
    $('div.candidate').css('opacity', '1');
  }

}

function selectOneDeselectOthers (type, targetFurl) {
  let buttons = $(targetFurl).find(':button');
  buttons.each((i, but) => {
    const { className } = but; // "infoButton-2 weButton noStyleWe deselected"
    // eslint-disable-next-line prefer-destructuring
    const number = className.match(/-(\d*)\s/)[1];

    const iterationType = className.substring(0, className.indexOf('Button'));
    /* eslint-disable indent */
    switch (iterationType) {
      case 'endorse':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'SUPPORT': '');
        break;
      case 'oppose':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'OPPOSE': '');
        break;
      case 'info':
        toggleSupportButton($(but), number, iterationType, className.startsWith(type) ? 'INFO_ONLY': '');
        break;
    }
    /* eslint-enable indent */
  });
}

// As of Sept 2019, we are only updating possiblilities here, we are not changing the "stored" live presentation data
function saveUpdatedCandidatePossiblePosition (event, detachedDialog) {
  const targetCand = event.currentTarget.className; // div.candidate.candidate-4
  const targetFurl = '#' + targetCand.replace('candidate candidate', 'furlable');
  // eslint-disable-next-line prefer-destructuring
  const number = targetFurl.match(/-(\d*)\s/)[1];
  const buttonContainerId = detachedDialog ? '#1000' : '#furlable-' + number;
  const buttons = $(buttonContainerId).find(':button');
  let stance = 'NO_STANCE';

  buttons.each((i, but) => {
    const {className} = but;   // "infoButton-2 weButton noStyleWe deselected"
    if (className.match(/endorse.*?selectedEndorsed/)) {
      stance = 'SUPPORT';
    } else if (className.match(/oppose.*?selectedOpposed/)) {
      stance = 'OPPOSE';
    } else if (className.match(/info.*?selectedInfo/)) {
      // 9/16/19: Dale says 'INFO_ONLY' should be saved as 'NO_STANCE' in this situation
      stance = 'NO_STANCE';
    }
  });

  const itemName = detachedDialog ? $('.candidateNameInput-1000').val() : '';
  const voterGuidePossibilityPositionId = detachedDialog ? 0 : $('#possibilityPositionId-' + number).val();
  const statementText = $('.statementText-' + number).val();
  const moreInfoURL = $('.moreInfoURL-' + number).val().trim();
  const {chrome: {runtime: {sendMessage}}} = window;
  sendMessage({
    command: 'savePosition',
    itemName,
    voterGuidePossibilityId: voterGuidePossibilityIdGlobal,
    voterGuidePossibilityPositionId,
    stance,
    statementText,
    moreInfoURL,
  },
  function (response) {
    let {lastError} = runtime;
    if (lastError) {
      console.warn(' chrome.runtime.sendMessage("savePosition")', lastError.message);
    }
    debugLog('saveUpdatedCandidatePossiblePosition() response', response);

    if (detachedDialog) {
      console.log('ZZZZZ  saveUpdatedCandidatePossiblePosition response before div.ui-dialog .remove()');
      $('div.ui-dialog').remove();
    } else {
      const furlables = $('.furlable');
      const thisDiv = $('#furlable-' + number);
      const lastDiv = furlables[furlables.length - 1];
      let forceNumber = Number(number);
      forceNumber = (thisDiv[0] === lastDiv) ? 0 : forceNumber + 1;
      for (let i = 0; i < 10; i++) {
        if ($('#furlable-' + forceNumber).length === 0) {
          forceNumber++;      // skip any missing elements
        } else {
          break;
        }
      }
      console.log('ZZZZZ  saveUpdatedCandidatePossiblePosition response before deactivate/unfurlOne');
      deactivateActivePositionPane();
      unfurlOnePositionPane(null, forceNumber);
    }
    // Here we are still in the response from 'savePosition'.  After a successful save on the right side (voterGuidePossibilityPositionSave in backgroundWeVoteAPICalls)
    // return here (the left side) and after advancing the open pane (above), call getRefreshedHighlights() (below) to send a 'getHighlights' message to the right side
    // (extWordHighlighter) with a doReHighlight: true.  This will invoke getHighlightsListFromApiServer this will make an API call
    // to /voterGuidePossibilityHighlightsRetrieve?, upon return from the API call, it will call initializeHighlightsData() (in backgroundWeVoteApiCalls)
    // to sort and process the raw highlights data, and then with doReHighlight true, will call requestReHighlight() which will then
    // send a message back to here (contentWeVoteU which is on the left side) with the processed data to do the re-highlighting.
    removeAllHighlights();
    getRefreshedHighlights();
  });
}

function unfurlOnePositionPane (event, forceNumber) {
  let targetFurl ='';
  let number = -1;
  if (forceNumber > -1) {
    targetFurl = '#furlable-' + forceNumber;
    number = forceNumber;
  } else {
    const targetCand = event.currentTarget.className; // div.candidate.candidate-4
    targetFurl = '#' + targetCand.replace('candidate candidate', 'furlable');
    number = targetFurl.substring(targetFurl.indexOf('-') + 1);
    let selectorForName = '#' + event.currentTarget.classList[1].replace('candidate', 'candidateName');
    unfurledCandidateNameGlobal = $(selectorForName).val();
  }
  const element = document.getElementById('unfurlable-' + number);
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); // alignTioTop
  $(targetFurl)[0].scrollIntoView();
  addHandlersForCandidatePaneButtons(targetFurl, number, false);
  $(targetFurl).removeAttr('hidden');
}

function addHandlersForCandidatePaneButtons (targetDiv, number, detachedDialog) {
  let buttons = $(targetDiv).find(':button');
  buttons.each((i, but) => {
    const { className } = but;
    if (className.startsWith('endorse')) {
      $(but).click(() => {
        selectOneDeselectOthers('endorse', targetDiv)
      });
    } else if (className.startsWith('oppose')) {
      $(but).click(() => {
        selectOneDeselectOthers('oppose', targetDiv)
      });
    } else if (className.startsWith('info')) {
      $(but).click(() => {
        selectOneDeselectOthers('info', targetDiv)
      });
    } else if (className.startsWith('revealLeft')) {
      $(but).click((event) => {
        event.stopPropagation();
        const emphasizedElement = $('#frame:first').contents().find(':contains(' + unfurledCandidateNameGlobal + '):last');
        if (emphasizedElement.length) {
          $(emphasizedElement)[0].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            // inline: 'center'
          });
        }
      });
    } else if (className.startsWith('openInAdminApp-')) {
      $(but).click((event) => {
        event.stopPropagation();
        const googleCivicElectionId = $('#googleCivicElectionId-' + number).val();
        let candidateName = $('#candidateName-' + number).val();
        candidateName = encodeURIComponent(candidateName);
        let URL = 'https://api.wevoteusa.org/c/?google_civic_election_id=' + googleCivicElectionId +
          '&hide_candidate_tools=0&page=0&state_code=&candidate_search=' + candidateName + '&show_all_elections=False';
        window.open(URL, '_blank');

      });
    } else if (className.startsWith('openInWebApp-')) {
      $(but).click((event) => {
        event.stopPropagation();
        const candidateWeVoteId = $('#candidateWeVoteId-' + number).val();
        if (candidateWeVoteId.length) {
          let URL = 'https://wevote.us/candidate/' + candidateWeVoteId + '/b/btdo/';
          window.open(URL, '_blank');
        }
      });
    } else if (className.startsWith('save')) {
      $(but).click((event) => {
        event.stopPropagation();
        saveUpdatedCandidatePossiblePosition(event, detachedDialog);
      });
    }
  });
}

function deactivateActivePositionPane () {
  const visibleElements = $('.furlable:visible');
  if (visibleElements.length > 0) {
    // console.log('deactivateActivePositionPane() visibleElements: ',visibleElements);
    // eslint-disable-next-line prefer-destructuring
    let visibleElement = visibleElements[0];
    let visibleElementId = visibleElement.id;
    let buttons = $('#' + visibleElementId + ' :button');
    buttons.unbind();
    $('#' + visibleElementId).attr('hidden', true);
    debugLog('deactivateActivePositionPane() buttons: ', buttons);  // Do not remove
  } else {
    debugLog('deactivateActivePositionPane() -- No open panes');    // Do not remove
  }
}

function rightNewGuideDialog () {
  let selector = $('#sideArea');
  let markup = "<div id='newGuide'>" +
    '<h3>Store Organization Info<br>for this Guide</h3><br>' +
    'Organization Name:<br>' +
    "<input type='text' class='orgNameNew' name='orgName'><br>" +
    'Organization Twitter Handle:<br>' +
    "<input type='text' class='orgTwitterNew' name='orgTwitter'><br>" +
    'State Code (two letters)(optional):<br>' +
    "<input type='text' class='orgStateNew' name='orgState'><br>" +
    'Comments:<br>' +
    "<textarea  class='orgCommentsNew' name='orgComments'></textarea></textarea><br><br>" +
    "<input type='button' id='saveToServer' class='weButton noStyleWe' value='Save to Server'>" +
    '</div>';
  $(selector).append(markup);
  document.getElementById('saveToServer').addEventListener('click', function () {
    debugLog('Save to Server pressed');
    saveNewOrgData();
    return false;
  });
}

function saveNewOrgData () {
  console.log('saveNewOrgData() ');
  let name = $('.orgNameNew').val();
  let twitter = $('.orgTwitterNew').val();
  let state = $('.orgStateNew').val();
  let comments = $('.orgCommentsNew').val();
  const { chrome: { runtime: { sendMessage } } } = window;
  sendMessage(
    {
      command: 'updateVoterGuide',
      voterGuidePossibilityId: voterGuidePossibilityIdGlobal,
      orgName: name,
      orgTwitter: twitter,
      orgState: state,
      comments: comments
    },
    function (response) {
      let {lastError} = runtime;
      if (lastError) {
        console.warn(' chrome.runtime.sendMessage("updateVoterGuide")', lastError.message);
      }
      console.log('saveNewOrgData() response', response);

      if (response && Object.entries(response).length > 0) {
        const {orgName, comments} = response.data;  // eslint-disable-line no-unused-vars

        // $('#orgLogo').attr("src", orgLogo);
        $('#orgName').text(orgName);
        $('#topComment').val(comments);
        debugLog('updateTopMenu orgName: ' + orgName);
        if (orgName === undefined) {
          rightNewGuideDialog();
        } else {
          $('#newGuide').remove();
          updatePositionsPanel();
        }
      } else {
        console.error('ERROR: updateTopMenu received empty response');
      }
    });
}
// The text they select, will need to be the full name that we send to the API, although they will have a chance to edit it before sending
// eslint-disable-next-line no-unused-vars
function openSuggestionPopUp (selection, pageURL, tabId) {
  const i = 1000;
  if (selection.length > 0) {
    let candidate = {
      name: selection,
      office: '',
      party:  undefined,
      photo: defaultImage,
      comment: '',
      url: window.location.href,
      stance: 'SUPPORT',
    };
    $(candidatePaneMarkup(i, i, i, candidate, true)).dialog({
      title: 'Create a We Vote endorsement',
      show: true,
      width: 340,
      resizable: false,
      fixedDimensions: true
    });
    $("button[title='Close']").css('float', 'right');
    $('.ui-dialog-titlebar').css('height', '22px');
    $('.ui-resizable-handle').css('display', 'none');
    $('.ui-dialog-title').css('margin-left', '6px');
    $('#unfurlable-' + i).css('height', '66px');
    const can = '.candidate.1000';
    $(can).css({'background-color': '#FFFFF6', 'padding': '8px 0 8px 8px'});
    $('#1000').removeClass();
    $('.candidateNameInput-1000').css({width: '80%', height: '24px'}).val(selection);
    $('.statementText-' + i).val(candidate.comment);
    $('.moreInfoURL-' + i).val(candidate.url);
    $('#voterGuidePossibilityId-' + i).val(voterGuidePossibilityIdGlobal);
    $('#organizationWeVoteId-' + i).val(organizationWeVoteIdGlobal);
    $('.openInWebApp-' + i).stop(); // Stop animations, on the webapp button, since we don't have the twitter id necessary for the url
    $('div.ui-dialog').on('dialogclose', () => {
      $('div.ui-dialog').remove();
    });
    addHandlersForCandidatePaneButtons('#1000', '1000', true);
  }
}

// SVGs lifted from WebApp thumbs-up-color-icon.svg and thumbs-down-color-icon.svg
function supportButton (i, type, stance) {
  let buttonText = '';
  let fillColor = '';
  let selectionStyle = '';
  let textClass = '';
  if (type === 'endorse') {
    buttonText = 'ENDORSED';
    textClass = 'supportButtonText';
    if (stance === 'SUPPORT') {
      fillColor = 'white';
      selectionStyle = 'selectedEndorsed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else if (type === 'oppose') {
    buttonText = 'OPPOSED';
    textClass = 'supportButtonText';
    if (stance === 'OPPOSE') {
      fillColor = 'white';
      selectionStyle = 'selectedOpposed';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  } else {
    buttonText = 'INFO ONLY';
    textClass = 'supportButtonTextNoIcon';
    if (stance === 'INFO_ONLY' || stance === 'NO_STANCE') {
      fillColor = 'white';
      selectionStyle = 'selectedInfo';
    } else {
      fillColor = '#235470';
      selectionStyle = 'deselected';
    }
  }

  let markup = "<button type='button' class='" + type + 'Button-' + i + ' weButton noStyleWe ' + selectionStyle + "'>";

  if (type === 'endorse' || type === 'oppose') {
    markup += "<svg class='supportButtonSVG' style='margin-top:3px'>";

    if (type === 'endorse') {
      markup += "<path fill='" + fillColor + "' d='M6,16.8181818 L8.36363636,16.8181818 L8.36363636,9.72727273 L6,9.72727273 L6,16.8181818 L6,16.8181818 Z M19,10.3181818 C19,9.66818182 18.4681818,9.13636364 17.8181818,9.13636364 L14.0895455,9.13636364 L14.6509091,6.43590909 L14.6686364,6.24681818 C14.6686364,6.00454545 14.5681818,5.78 14.4086364,5.62045455 L13.7822727,5 L9.89409091,8.89409091 C9.67545455,9.10681818 9.54545455,9.40227273 9.54545455,9.72727273 L9.54545455,15.6363636 C9.54545455,16.2863636 10.0772727,16.8181818 10.7272727,16.8181818 L16.0454545,16.8181818 C16.5359091,16.8181818 16.9554545,16.5227273 17.1327273,16.0972727 L18.9172727,11.9313636 C18.9704545,11.7954545 19,11.6536364 19,11.5 L19,10.3713636 L18.9940909,10.3654545 L19,10.3181818 L19,10.3181818 Z'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    } else if (type === 'oppose') {
      markup += "<path fill='" + fillColor + "' d='M5,18.8199997 L7.36399994,18.8199997 L7.36399994,11.7279999 L5,11.7279999 L5,18.8199997 L5,18.8199997 Z M18.0019997,12.3189999 C18.0019997,11.6688999 17.4700997,11.1369999 16.8199997,11.1369999 L13.0907898,11.1369999 L13.6522398,8.43612996 L13.6699698,8.24700997 C13.6699698,8.00469997 13.5694998,7.78011998 13.4099298,7.62054998 L12.7834698,7 L8.8946899,10.8946899 C8.67601991,11.1074499 8.54599991,11.4029499 8.54599991,11.7279999 L8.54599991,17.6379997 C8.54599991,18.2880997 9.07789989,18.8199997 9.72799988,18.8199997 L15.0469997,18.8199997 C15.5375297,18.8199997 15.9571397,18.5244997 16.1344397,18.0989797 L17.9192597,13.9324298 C17.9724497,13.7964998 18.0019997,13.6546598 18.0019997,13.5009998 L18.0019997,12.3721899 L17.9960897,12.3662799 L18.0019997,12.3189999 L18.0019997,12.3189999 Z' transform='rotate(-180 11.501 12.91)'/>" +
        "<path d='M0 0h24v24H0z' fill='none'/>";
    }

    markup += '</svg>';
  }

  markup += "<span class='" + textClass + "'>" + buttonText + '</span></button>';

  return markup;
}

function toggleSupportButton (button, i, type, stance) {
  const svg = $(button.find('path')[0]);
  if (type === 'endorse') {
    if (stance === 'SUPPORT') {
      button.removeClass('deselected').addClass('selectedEndorsed');
      svg.attr('fill', '#FFFFFF');  // Modify the SVG thumb color to be white
    } else {
      button.removeClass('selectedEndorsed').addClass('deselected');
      svg.attr('fill', '#235470');
    }
  } else if (type === 'oppose') {
    if (stance === 'OPPOSE') {
      button.removeClass('deselected').addClass('selectedOpposed');
      svg.attr('fill', '#FFFFFF');  // Modify the SVG thumb color to be white
    } else {
      button.removeClass('selectedOpposed').addClass('deselected');
      svg.attr('fill', '#235470');
    }
  } else if (stance === 'INFO_ONLY' || stance === 'NO_STANCE') {
    button.removeClass('deselected').addClass('selectedInfo');
  } else {
    button.removeClass('selectedInfo').addClass('deselected');
  }
}

function isParentFurlable (target) {
  const { classname } = target;
  if (classname === 'furlable') {
    return true;
  }
  let i = 0;
  let scan = target;
  while(scan && scan.id !== 'sideArea' && scan.className !== 'furlable') {
    scan = scan.parentElement;
    if(i++ > 10) {
      break;
    }
  }
  return scan && (scan.className === 'furlable');
}

function attachClickHandlers () {
  //console.log("attachClickHandlers", $('div.candidate').length);

  $('div.candidate').click((event) => {
    if (!isParentFurlable(event.target)) {
      deactivateActivePositionPane();
      unfurlOnePositionPane(event, -1);
    } else {
      debugWarn('Candidate click IGNORED since target is in furlable area', event);
    }
  });
}
