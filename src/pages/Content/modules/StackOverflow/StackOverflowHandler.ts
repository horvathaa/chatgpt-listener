import { Code } from '../GitHub/GitHubHandler';

class StackOverflowHandler {
  _copiedCode: Code | undefined;
  constructor() {
    this.init();
  }

  init() {
    this.listen();
  }

  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.command === 'githubOpen') {
        const { url, title } = request.payload;
        if (url.includes('/questions/')) {
          this.handleQuestion(url, title);
        }
      }
    });
  }

  handleQuestion(url: string, title: string) {}
}

export default StackOverflowHandler;
