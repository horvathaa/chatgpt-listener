import ChatGptThread from './ChatGptThread/ChatGptThread';

class ChatGptHandler {
  _threads: Map<string, ChatGptThread> = new Map();
  constructor() {
    this.init();
  }

  init() {
    this.listen();
  }

  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('request:', request, 'sender:', sender);
      if (request.command === 'chatOpen') {
        // window.onload = () => {
        // document.addEventListener('DOMContentLoaded', () => {
        console.log('request:', request, 'threads', this._threads);
        if (!this._threads.has(request.payload)) {
          this._threads.set(request.payload, new ChatGptThread());
        } else {
          const thread = this._threads.get(request.payload);
          thread?.initPageObserver();
        }
        // };
        // });
      }
    });
  }
}

export default ChatGptHandler;
