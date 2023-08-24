import { COMMANDS } from '../../../Background/modules/GenericListener';

interface SearchData {
  query: string;
  url: string;
  selectedPages: string[];
  searhTime: Date;
}

const SELECTORS = {
  searchResults: 'rso',
};

class GoogleHandler {
  _query: string | null = null;
  _url: string | null = null;
  _searchResults: string[] = [];
  _searchData: SearchData | null = null;
  constructor() {
    this.init();
    // this._query = query;
    // this._url = `https://www.google.com/search?q=${this._query}`;
  }

  init() {
    this.listen();
  }
  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.command === COMMANDS.GOOGLE_OPEN) {
        const { title, url } = request.payload;
        console.log('got this', title, url);
        this._query = title.replace(' - Google Search', '');
        this._url = url;
        console.log('about to init search', this._query, this._url);
        this.search();
      }
    });
  }

  isCodingSearch() {
    return this._searchResults?.some((s) => s.includes('stackoverflow'));
  }

  search() {
    if (this._query && this._url) {
      this._searchData = {
        query: this._query,
        url: this._url,
        selectedPages: [],
        searhTime: new Date(),
      };
      const results = document
        .getElementById(SELECTORS.searchResults)
        ?.querySelectorAll('a');
      console.log('results', results);
      if (results) {
        results.forEach((result) => {
          const href = result.getAttribute('href');
          if (!href) return;
          const url = href.replace('/url?q=', '');
          this._searchResults.push(url);
          result.addEventListener('click', (e) => {
            if (this.isCodingSearch()) {
              console.log('coding search', url);
              this._searchData?.selectedPages.push(url);
              chrome.runtime.sendMessage({
                command: COMMANDS.GOOGLE_SEARCH,
                data: this._searchData,
              });
            } else {
              console.log('not coding search', url);
              this._searchData = null;
              chrome.runtime.sendMessage({
                command: COMMANDS.GOOGLE_SEARCH,
                data: null,
              });
            }
          });
        });
      }
      //   this._searchResults.addEventListener('click', this.onSearchResultsClick);
    }
  }
}

export default GoogleHandler;
