**6/26/23**
* Yellow highlights disappear in non-paneled mode, after adding a candidate
* fix updateBackgroundForButtonChange Unchecked runtime.lastError: The message port closed before a response was received.
* In non-paneled view, it is difficult to hit the Green/Red?Grey highlight and get the "Edit candidate endoresment" modal dialog -- too often get the "Add" modal.
* Loses state in the "W" pop-up after using the paned view.
* Sometimes the first attempt at "Open Edit Panel" does not respond, and needs to be rerun.
  * 0.641 : chrome.runtime.sendMessage({command: 'getStatus'} https://giffords.org/elections/endorsements/past-endorsements/commonWeVote.js:93
  * 0.641 : response from getStatus undefined commonWeVote.js:93
  * 0.641 : ERROR: sendMessage for getStatus returned no status
* Sometimes after a few edits on left, then on right, when you go back to left the onclick for Greens gets broken.
* ~~Right click on green/red does not work until getCombinedHighlights completes (7 + 23 seconds in my case)~~
* ~~fix 'showHighlightsCount'~~
* ~~Update the endorsement page in editor view, when the status of the highlight is changed via iframe to WebApp~~
* ~~No repro: Delete a candidate in right pane, but they stay highlighted in the left (the db is correctly updated)~~
* ~~No repro: Delete a candidate in right pane, but they stay highlighted in the left (the db is correctly updated)~~
* ~~After an edit, the endorsement count green ball goes to zero~~
* ~~Can't edit two candidates between hard refreshes, right-click does not work 2nd time~~
* ~~Info only selection sometimes appears as grey, sometimes as purple.~~

**Lower Priority**
* Switch tabs (diff organizations) and the right pane preserves the content from the previous pane.
* In paneled, after editing with the dialog, we run handleUpdatedOrNewPositions twice, which is wasteful
* On some pages the name of the candidate gets split into two adjacent clickable links, but only prefills the add dialog with the half of the name you clicked on.  Maybe cache the matches and then lookup the name and prefill the name field, if you only get one word.
* The state of the buttons in the popup gets cleared and is inconsistent on pdf -> html
* Can't edit names in the right pane.
* Get those last 'Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.' errors

**Test Cases**
* https://candidates.aipacpac.org/page/featured/
* Prior years:  https://giffords.org/elections/endorsements/past-endorsements/
* 

**6/20/23**
* ~~Looks like the suppression code breaks refresh after editing in non-paneled mode, as is edit vs add~~
* ~~Editing a candidate in left, does a refresh, but does not catch the change~~
* ~~highlight loop keeps going after reloading endorsement page~~
* ~~Colin Allred example, set info only, appears red on left, plum on right~~
* ~~In paneled mode:  Adding a candidate auto-closes on save, but editing does not auto-close the dialog~~
 

**6/6/23**
* ~~Loses top and right pane, after editing a candidate on the endorsement page.~~
* ~~After add on left, right pane disappears (removed experimental getRefreshedHighlights @ L618 in contentWeVoteUI)~~
* ~~Delete button takes forever, left pane fully updates first (removal of experiment above did it)~~
* ~~Yellow into a green in left pane, Ret right pane with lots of dupes, green sticks on left~~


**5/31/23**
* ~~Sending showHighlightsCount of zero after sending 9 correctly~~
* ~~Update stance in left pane, updates right pane, then loses right pane~~
* ~~Completely eliminate weContentState, highlighterEditorEnabled, highlighterEnabled -- legacy variables that just caused stale data and confusion~~

**5/25/23**
* Paneled and Non-Paneled is working now.
* API performance is 50x faster for time critical calls see https://github.com/wevote/WeVoteServer/pull/2130
* on https://giffords.org/elections/endorsements/past-endorsements/
  * Non-paneled seems to work well, if you "load more" candidates, they get highlighted progressively, but
  if you edit/add a candidate with the popup.  "load more" loads candidates, but doesn't highlight them.

**5/19/23**
* ~~There is a horrible performance problem on the live server with voterGuidePossibilityHighlightsRetrieve,
this api completes in a second on the local Python server, and only completes 2/3s of the time on the live api server, and when it does complete it takes 45 to 90 seconds.~~
* ~~Paneled using a local API server is very fast, with the green highlights appearing in less than a second, and with the yellow highlights in 15 seconds.  The code is currently configured to send 26k old candidates, instead of just this year's, so even that will speed up by a huge amount.~~
* ~~Non-paneled is slower, and sometimes after drawing the greens, then the yellows, reload the page and only shows the greens.  Sometimes it works perfectly.~~

* Medium issue: The CADEM pdf, shows the need for an automatically scalable thumbIconSVGContent, or a collection of fixed sizes, here we need 10pt
* Minor issue: Handle close error in popup.js: Unchecked runtime.lastError: The message port closed before a response was received.
* Minor issue: More efficient replacement for tabWordHighligher L 449, where we don't even ask status from "other" tabs.

**4/4/23**
* For PDFS, Tabs usually only open on second load of pdf -> html
* On opening a pdf (Open Edit Panel mode), it sometimes takes a minute or two for the green highlights to appear,  This is on (CADEM)[https://cadem.org/wp-content/uploads/2022/09/2022-CADEM-General-Endorsements.pdf] which is a very dense page with 140 highlights.
Works decently on (Everydistrict)[https://everydistrict.us/candidates/2022-candidates/]. 
* Performance is still inconsistent, with multiple opportunities for reworking sections of code.  First load of a medium complex page like every district is now very good.
  * I have the new options on APIs to load more than one year, turned on to work with old endorsement pages, this is a performance degradation that can be easily adjusted. (allowAnyYearForVoterGuides etc.)
* On "Open Edit Panel", changes the refresh of the right side panel is so slow, and requires a full page refresh, which is slow on a dense or slow to load page -- must be a better way.
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





