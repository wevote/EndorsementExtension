**5/19/23**
* There is a horrible performance problem on the live server with voterGuidePossibilityHighlightsRetrieve,
this api completes in a second on the local Python server, and only completes 2/3s of the time on the live api server, and when it does complete it takes 45 to 90 seconds.
* Tabbed using a local API server is very fast, with the green highlights appearing in less than a second, and with the yellow highlights in 15 seconds.  The code is currently configured to send 26k old candidates, instead of just this year's, so even that will speed up by a huge amount.
* Non-tabbed is slower, and sometimes after drawing the greens, then the yellows, reload the page and only shows the greens.  Sometimes it works perfectly.
* Sometimes the first attempt at tabbed does not respond, and needs to be rerun.

**Lower Priority**
* Medium priority: Update the endorsement page in editor view, when the status of the highlight is changed via iframe to WebApp 
* Lower priority: On some pages the name of the candidate gets split into two adjacent clickable links, but only prefills the add dialog with the half of the name you clicked on.  Maybe cache the matches and then lookup the name and prefill the name field, if you only get one word.
* Lower priority: The state of the buttons in the popup gets cleared and is inconsistent on pdf -> html
* Lower priority: Can't edit names in the right pane.
* Lower priority: Get those last 'Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.' errors

* Medium issue: The CADEM pdf, shows the need for an automatically scalable thumbIconSVGContent, or a collection of fixed sizes, here we need 10pt
* Minor issue: Handle close error in popup.js: Unchecked runtime.lastError: The message port closed before a response was received.
* Minor issue: More efficient replacement for tabWordHighligher L 449, where we don't even ask status from "other" tabs.

**4/4/23**
* For PDFS, Tabs usually only open on second load of pdf -> html
* On opening a tabbed pdf, it sometimes takes a minute or two for the green highlights to appear,  This is on (CADEM)[https://cadem.org/wp-content/uploads/2022/09/2022-CADEM-General-Endorsements.pdf] which is a very dense page with 140 highlights.
Works decently on (Everydistrict)[https://everydistrict.us/candidates/2022-candidates/]. 
* Performance is still inconsistent, with multiple opportunities for reworking sections of code.  First load of a medium complex page like every district is now very good.
  * I have the new options on APIs to load more than one year, turned on to work with old endorsement pages, this is a performance degradation that can be easily adjusted. (allowAnyYearForVoterGuides etc.)
* On tabbed, changes the refresh of the right side panel is so slow, and requires a full page refresh, which is slow on a dense or slow to load page -- must be a better way.
* ~~Edit pop-up does not show endorsement text~~
* ~~The edit pop up (Max's second dialog EditCandidateForExtension.js), is not yet used, and it would be useful~~

**3/24/23**
* https://wevote-temporary.s3.amazonaws.com/2022-CADEM-General-Endorsements.html
  * Multiple issues with clicking on highlights
    * ~~setModal is not defined~~
* Minor issue (one site's html): https://www.californiaprolife.org/wp-content/uploads/2014/10/CPLC-PAC-Ballot-Endorsements.pdf
  * Get an extra last letter outside of the highlights -- District 23 –Kevin McCarthyy (R)
  * ~~Yellow highlight click takes you to the broken edit window (Max 2)~~
    * ~~https://wevotedeveloper.com:3000/candidate-for-extension?candidate_name=Kristen%20McDonald%20Rivet&amp;candidate_we_vote_id=wvehcand2292542&endorsement_page_url=https%3A%2F%2Feverydistrict.us%2Fcandidates%2F2022-candidates%2F~~ 
    * Select with right click only prefills (AddCandidateForExtension) with first or last name.
* ~~Sign out no longer implemented, mostly needed for testing.  Show editor with sign in avatar, then go to webapp and sign-out, when you return you get an all blue tab for about 30 seconds, and it still shows you as signed in via avatar.~~
* ~~URGENT: Subsequent tabs open in editor, if editor is already open, and create a garbage voter guide possibility on the production server~~
* ~~Must debounce sign in button~~
* ~~Sign in works, but sometimes has 30 to 90 second blue window, with no logging after returning from WebApp.~~


**3/20/23**
* Speed Final checks, and without so much logging
* Someday: Maybe recover multi-tab processing, with a list at the bottom of pop-up to show which are enable.  Might need to check if "enabled" tab has been refreshed.

**3/8/23**
* ~~Pop up dialog from pop up if on a Tab, and not signed in~~
* ~~Test PDF processing (is broken)
  https://cadem.org/wp-content/uploads/2022/09/2022-CADEM-General-Endorsements.pdf~~
* ~~After sign in, when you return there is a ~30 second blue screen~~
* ~~Highlight tab button, opens edit panel~~

**2/17/23**
* ~~Test PDF processing~~
* ~~Still have a small bit of (lower priority) multi-tab selection code to clean out.~~
* ~~Newly created/edited in main pane, should cause side pane to reload~~
* ~~Completely eliminate weContentState, just causes stale date and confusion~~
* ~~More main pane/side pane testing~~
* ~~Delete in right pane, does deletion in right pane, then causes entire page to reload instead of just the left pane.~~

**2/13/23**
* ~~Newly created/edited in main pane, should cause side pane to reload~~
* Speed Final checks, and without so much logging
* ~~More main pane/side pane testing~~ 
* ~~Still have (lower priority) multi-tab selection code to clean out.~~
* ~~Sign in is erratic, unsure~~

**2/7/23**
* ~~Re-entry to the pop-up should show current state, and allow you to undo it.~~
* ~~Pop-up enable highlight should work, and show current state~~
* ~~Speed Speed Speed~~
* ~~Close iFrame after complete~~

**2/6/23**
~~Every district appears in list of orgs in the right pane, 
but clicking it does nothing~~

**8/3/22**
* https://apademcaucus.org/endorsed-candidates-june-2022-election/  Lena Tam pdf 

**7/30/22:**
* ~~Still not there in terms of reliably starting up on a non-hard-reloaded every-district.us test case~~
* ~~Waiting for Max to finish candidate-for-extension:~~

**7/29/22:**
* ~~On 'https://everydistrict.us/candidates/2022-candidates/' the 19 green highlights appear in 4 seconds, the yellows take 35 seconds to appear.~~ 
* ~~I wonder if I need to adjust life time of background, so that there is something to receive to addrress: "Unchecked runtime.lastError: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"~~
* ~~When the editor is displayed, and I remove the highlighting, The popup.js receives 
"updateBackgroundForButtonChange:  undefined" followed by "Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist."
and the right pane does not find matches on subsequent opening of edit panel.~~


**7/15/22:**
* ~~https://cdn.wevoteusa.org/apis/v1/ballotItemHighlightsRetrieve/ takes 22.14 seconds and 21 of them is waiting for server to respond (processing)~~
* ~~ballotItemHighlightsRetrieve takes 1/4 second locally (257kb gzipped)~~ 
* ~~and 'https://api.wevoteusa.org/apis/v1/voterGuidePossibilityPositionsRetrieve/?voter_device_id=7PEDIgXesYCkENRKCgmsKp5gTENRUsHvsqRgG6OZOLXEBSjkg3KDe9ZNCoYCRsTBC05JqcUdEAIXPcnKnUyrw3tZ&voter_guide_possibility_id=undefined' takes 14 seconds and returns 257kb gzipped~~





