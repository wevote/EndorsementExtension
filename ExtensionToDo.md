**2/17/23**
* Handle close error in popup.js: Unchecked runtime.lastError: The message port closed before a response was received.
* More efficient replacement for tabWordHighligher L 449, where we dont even ask status from "other" tabs.
* Speed Final checks, and without so much logging
* Test PDF processing
* Still have a small bit of (lower priority) multi-tab selection code to clean out.
* Sign in works, but sometimes has 30ish second blue window, with no logging after returning from WebApp 
* Integrate Max's edit dialog (create is hard coded)
* ~~Newly created/edited in main pane, should cause side pane to reload~~
* ~~Completely eliminate weContentState, just causes stale date and confusion~~
* ~~More main pane/side pane testing~~
* ~~Delete in right pane, does deletion in right pane, then causes entire page to reload instead of just the left pane.~~

**2/13/23**
* Newly created/edited in main pane, should cause side pane to reload
* Integrate Max's edit dialog (create is hard coded)
* Speed Final checks, and without so much logging
* Test PDF processing
* More main pane/side pane testing 
* Still have (lower priority) multi-tab selection code to clean out.
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
* ~~Waiting for Max to finish candidate-for-extension: ~~`<button type="button" id="KristenMcDonaldRivet" class="endorsementHighlights" onclick="setModal(true, 'https://wevote.us/candidate-for-extension?candidate_name=Kristen%20McDonald%20Rivet&amp;candidate_we_vote_id=wvehcand2292542&amp;endorsement_page_url=https%3A%2F%2Feverydistrict.us%2Fcandidates%2F2022-candidates%2F&amp;candidate_specific_endorsement_url=&amp;voter_guide_possibility_id=6284', 'KristenMcDonaldRivet', event)"><em class="Highlight" style="padding: 1px; box-shadow: rgb(229, 229, 229) 1px 1px; border-radius: 3px; -webkit-print-color-adjust: exact; background-color: rgb(180, 231, 205); color: rgb(40, 176, 116); font-style: inherit;"><svg class="thumbIconSVGContent" style="margin-top:3px"><path fill="#28b074" d="M6,16.8181818 L8.36363636,16.8181818 L8.36363636,9.72727273 L6,9.72727273 L6,16.8181818 L6,16.8181818 Z M19,10.3181818 C19,9.66818182 18.4681818,9.13636364 17.8181818,9.13636364 L14.0895455,9.13636364 L14.6509091,6.43590909 L14.6686364,6.24681818 C14.6686364,6.00454545 14.5681818,5.78 14.4086364,5.62045455 L13.7822727,5 L9.89409091,8.89409091 C9.67545455,9.10681818 9.54545455,9.40227273 9.54545455,9.72727273 L9.54545455,15.6363636 C9.54545455,16.2863636 10.0772727,16.8181818 10.7272727,16.8181818 L16.0454545,16.8181818 C16.5359091,16.8181818 16.9554545,16.5227273 17.1327273,16.0972727 L18.9172727,11.9313636 C18.9704545,11.7954545 19,11.6536364 19,11.5 L19,10.3713636 L18.9940909,10.3654545 L19,10.3181818 L19,10.3181818 Z"></path><path d="M0 0h24v24H0z" fill="none"></path></svg>Kristen McDonald Rivet</em></button>`

**7/29/22:**
* ~~On 'https://everydistrict.us/candidates/2022-candidates/' the 19 green highlights appear in 4 seconds, the yellows take 35 seconds to appear.~~ 
* ~~I wonder if I need to adjust life time of background, so that there is something to receive to addrress: "Unchecked runtime.lastError: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"~~
* ~~When the editor is displayed, and I remove the highlighting, The popup.js receives 
"updateBackgroundForButtonChange:  undefined" followed by "Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist."
and the right pane does not find matches on subsequent opening of edit panel.~~


**7/15/22:**
* https://cdn.wevoteusa.org/apis/v1/ballotItemHighlightsRetrieve/ takes 22.14 seconds and 21 of them is waiting for server to respond (processing)
* ballotItemHighlightsRetrieve takes 1/4 second locally (257kb gzipped) 
* and 'https://api.wevoteusa.org/apis/v1/voterGuidePossibilityPositionsRetrieve/?voter_device_id=7PEDIgXesYCkENRKCgmsKp5gTENRUsHvsqRgG6OZOLXEBSjkg3KDe9ZNCoYCRsTBC05JqcUdEAIXPcnKnUyrw3tZ&voter_guide_possibility_id=undefined' takes 14 seconds and returns 257kb gzipped





