Press the "Open Edit Panel for this Tab" button 
in extWordHighligher
  setEnableForActiveTab
    sends 'displayHighlightsForTabAndPossiblyEditPanes'
      sends 'ballotItemHighlightsRetrieve'
1        processHighlightsRetrieve(tabId, locationHref, ballotItemHighlightsRetrieveResponse, voterGuidePossibilityHighlightsRetrieveResponse,  doReHighlight, sendResponse);
          sendResponse({ highlights: ballotItemHighlights.length, nameToIdMap });

in tabWordHighlighter
  receives 'displayHighlightsForTabAndPossiblyEditPanes'
    clear GlobalState
    displayHighlightingAndPossiblyEditor(showHighlights, showPanels, tabId);
    return false


in backgroundWeVoteAPICalls
  getHighlightsListsFromApiServer(request.url, request.voterDeviceId, request.tabId, request.doReHighlight, sendResponse, showVoterGuideHighlights, showCandidateOptionsHighlights);
    API: voterGuidePossibilityHighlightsRetrieve
2    Retrieves the "11" highlighted in green red grey candidates for this page
      API: ballotItemHighlightsRetrieve
3        Retrieves 27k highlight_list entries (yellows)
4        processHighlightsRetrieve(tabId, locationHref, ballotItemHighlightsRetrieveResponse, voterGuidePossibilityHighlightsRetrieveResponse, doReHighlight, sendResponse);
          requestReHighlight()
             sends 'ReHighlight'

in tabWordHighlighter
  reHighlight(request.words);
    builds the global to tabWordHighlighter wordsArray with all the color groups
    findWords();
      new Hilitor()
      builds the markerPositions list
      updateGlobalState({ 'positions': state.positions });
      sends 'showHighlightsCount'
      convertV2OnClickToV3

in contentWeVoteUI
  displayHighlightingAndPossiblyEditor(showHighlights, showPanels, tabId)
     getHighlights(showHighlights, showPanels, tabId)
       sends 'getHighlights'

in contentWeVoteUI
      receives response from 'getHighlights'
        if showPanels 
          displayEditPanes();
          doGetCombinedHighlights(showPanels, tabId, urlToQuery);
            sends 'getCombinedHighlights'

in extWordHighlighter
  getHighlightsListsFromApiServer(request.url, request.voterDeviceId, request.tabId, request.doReHighlight, sendResponse, showVoterGuideHighlights, showCandidateOptionsHighlights); 
    API: voterGuidePossibilityHighlightsRetrieve
    Retrieves the "11" highlighted in green red grey candidates for this page
