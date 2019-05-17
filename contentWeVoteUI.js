const $ = window.$;

function displayWeVoteUI () {  // eslint-disable-line no-unused-vars
  try {
    // https://codepen.io/markconroy/pen/rZoNbm
    let hr = window.location.href;
    let topMenuHeight = 75;
    let sideAreaWidth = 400;
    let iFrameHeight = window.innerHeight - topMenuHeight;
    let iFrameWidth = window.innerWidth - sideAreaWidth;
    let bod = $('body');
    $(bod).children().wrapAll("<div id='we-trash' >").hide();  // if you remove it, other js goes nuts
    $(bod).children().wrapAll("<div id='weContainer' >");  // Ends up before we-trash
    $('#we-trash').insertAfter('#weContainer');

    let weContainer = $('#weContainer');
    $(weContainer).append("" +
      "<span id='topMenu'>" +
      "</span>").append("<div id='weFlexGrid' ></div>");

    let weFlexGrid = $('#weFlexGrid');
    $(weFlexGrid).append('<aside id="frameDiv"><iframe id="frame" width=' + iFrameWidth + ' height=' + iFrameHeight + '></iframe></aside>');
    $(weFlexGrid).append('<section id="sideArea"></section>');

    $("#frame").attr("src", hr);

    topMenu();
    // let noCandiatesFromServerYet = [];
    // candidatePanel(noCandiatesFromServerYet, $("#sideArea"));

    updateTopMenu();

    updatePositionsPanel();
  } catch (err) {
    console.log("jQuery dialog in tabWordHighligher threw: ", err);
  }
  return true;  // indicates that we call the response function asynchronously.  https://stackoverflow.com/questions/20077487/chrome-extension-message-passing-response-not-sent
}

/*
  May 16, 2019
  TODO: For now if the API server is swapped local/production you will need to get a new device ID.
  With the extension running, go to the wevote.us or localhost:3000 page, and open the popup, and press the login button.
  Then when you navigate to some endorsement page. the device id will be available in local storage.
 */

function signIn() {
  console.log("STEVE new signIn");
  chrome.runtime.sendMessage({ command: "getVoterInfo",},
    function (response) {
      const { voterName, voterPhotoURL, voterWeVoteId, voterEmail } = response;
      voterInfo = {
        name: voterName,
        photo: voterPhotoURL,
        voterId: voterWeVoteId,
        email: voterEmail
      };

      if (voterPhotoURL.length > 0) {
        $('#signIn').replaceWith("<img class='photov voterPhoto noStyleWe' alt='candidate' src=" + voterPhotoURL + " />");
      }
    });
  return false;
}


function topMenu() {
  let topMarkup = "" +
    "<img id='orgLogo' src='https://raw.githubusercontent.com/wevote/EndorsementExtension/develop/icon48.png'>" +
    "<b><span id='orgName'></span></b>" +
    "<input type='text' id='email' name='email' placeholder='Email' >" +
    "<input type='text' id='topComment' name='topComment' placeholder='Comment here...' >" +
    "<button type='button' id='signIn' class='signInButton weButton noStyleWe'>SIGN IN</button>";
  $('#topMenu').append(topMarkup);

  console.log("STEVE BEFORE ADDING SI?GN??????IN HANDLER");
  document.getElementById("signIn").addEventListener('click', function () {
    console.log("Sign in pressed");
    signIn();
    return false;
  });

  // $('#signIn').on('click', 'button', function(){
  //   signIn();
  // });
}

// Call into the background script to do a voterGuidePossibilityRetrieve() api call, and return the data, then update the top menu
function updateTopMenu() {
  console.log("STEVE updateTopMenu()");
  chrome.runtime.sendMessage({ command: "getTopMenuData", url: window.location.href },
    function (response) {
      console.log("STEVE updateTopMenu() response", response);

      if (response && Object.entries(response).length > 0 ) {
        const { email, orgName, twitterHandle, weVoteId, orgWebsite, orgLogo, possibilityUrl, possibilityId } = response.data;  // eslint-disable-line no-unused-vars

        $('#orgLogo').attr("src", orgLogo);
        $("#orgName").text(orgName);
        $("#email").text(email);
      } else {
        console.log("ERROR: updateTopMenu received empty response");
      }
    });
}

function updatePositionsPanel() {
  console.log("STEVE getPositions()");
  chrome.runtime.sendMessage({ command: "getPositions", url: window.location.href },
    function (response) {
      console.log("STEVE getPositions() response", response);
      if ((response && Object.entries(response).length > 0) && (response.data !== undefined) && (response.data.length > 0)) {
        let data = response.data;
        let l = data.length;
        let selector = $("#sideArea");
        if (l > 0) {
          for (let i = 0; i < l; i++) {
            console.log("STEVE getPositions data: ", data[i]);
            let {ballot_item_name: name, position_stance: stance, statement_text_stored: comment, more_info_url_stored: url} = data[i];
            let position = {
              name: name,
              office: "(Unknown)",
              photo: 'https://wevote-images.s3.amazonaws.com/wv02cand40159/twitter_profile_image-20181004_1_48x48.jpeg',
              comment: comment ? comment : "",
              stance: stance,
              url: url ? url : ""
            };
            rightPositionPanes(i, position, selector);
          }
        }
      } else {
        console.log("ERROR: updatePositionsPanel() getPositions returned an empty response or no data element.")
      }
    }
  );
}

function rightPositionPanes(i, candidate, selector) {
  let markup = "" +
    "<div class='candidate'>" +
      "<div class='unfurlable'>" +
        "<span class='unfurlableTopMenu'>" +
          "<img class='photo" + i + " noStyleWe' alt='candidate' src=" + candidate.photo + " />" +
          "<div class='nameBox" + i + "  noStyleWe'>" +
            "<div class='nameField" + i + " '>" + candidate.name + "</div>" +
            "<div class='titleField" + i + " '>" + candidate.office + "</div>" +
          "</div>" +
        "</span>" +
      "</div>" +
      "<div class='furlable'>" +
        "<span class='buttons'>" +
          "<button type='button' class='endorsedButton" + i + " weButton noStyleWe' >Endorsed</button>" +
          // "<button type='button' id='endorsedButton' class='fas fa-check' >Endorsed</button>" +
          "<button type='button' class='opposedButton" + i + " weButton noStyleWe' >Opposed</button>" +
          "<button type='button' class='infoButton" + i + " weButton noStyleWe' >Information Only</button>" +
        "</span>" +
        "<textarea rows='6' class='commentWe" + i + "' placeholder='url' />" +
        "<input type='text' class='sourceWe" + i + "' placeholder='url' />" +
        "<span class='bottomButton'>" +
          "<button type='button' class='saveButton" + i + " weButton noStyleWe' >Save</button>" +
        "</span>" +
      "</div>" +
    "</div>";
  $(selector).append(markup);
  $('.commentWe' + i).val(candidate.comment);
  $('.sourceWe' + i).val(candidate.url);
  $(selector).css({'height': $('#frameDiv').height() + 'px', 'overflow': 'scroll'});
}
