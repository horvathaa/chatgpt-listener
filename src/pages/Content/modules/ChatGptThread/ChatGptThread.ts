export function debounce(func: Function, timeout = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: [args: any]) => {
    clearTimeout(timer);
    // @ts-ignore
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

interface ThreadItem {
  id: string;
  time: number;
  user: string;
  message: string;
}

class ChatGptThread {
  _observer: MutationObserver | null = null;
  _threadItems: ThreadItem[] = [];
  constructor() {
    this.init();
  }

  init() {
    this.initPageObserver();
  }

  // generic function to create a mutation observer
  createObserver(
    functionToApply: MutationCallback,
    selection: string,
    node = document.body
  ) {
    const foundNode = node.querySelector(selection);
    if (foundNode) {
      const config: MutationObserverInit = { childList: true, subtree: true };
      const observer = new MutationObserver(functionToApply);
      observer.observe(node, config);
      return observer;
    } else {
      setTimeout(
        () => this.createObserver(functionToApply, selection, node),
        1000
      );
    }
  }

  // listen until chatgpt is done generating an answer -- pass in parent node and selector of text area
  // other option may be to just do the setTimeout and wait for a couple seconds until it's presumably done
  botListener(node: Element) {
    const targetNode: Node | Element | null = node.querySelector(
      '.flex-col.text-sm.dark\\:bg-gray-800' // not sure if this will remain constant...
    );
    if (targetNode) {
      const config: MutationObserverInit = { childList: true, subtree: true };
      console.log('this??', this);
      console.log('new thread items', this._threadItems);
      //   const context = this;
      //   const callback: MutationCallback = (
      //     mutationsList: MutationRecord[],
      //     observer: MutationObserver
      //   ) => {};
    }
  }

  initPageObserver() {
    const targetNode: Node | Element | null = document.body.querySelector(
      '.flex-col.text-sm.dark\\:bg-gray-800' // not sure if this will remain constant...
    );
    if (targetNode) {
      const config: MutationObserverInit = { childList: true, subtree: true };
      console.log('this??', this);
      console.log('new thread items', this._threadItems);
      //   const context = this;
      //   const callback: MutationCallback = (
      //     mutationsList: MutationRecord[],
      //     observer: MutationObserver
      //   ) => {};
      //   this.initPageObserver = this.initPageObserver.bind(this);
      this._observer = new MutationObserver(this.debounceHandleMessages);

      this._observer.observe(targetNode, config);
    }
    // if we cant find the target node, wait a second and try again
    else {
      setTimeout(() => this.initPageObserver(), 1000);
    }
  }

  handleMessages: MutationCallback = (
    mutationsList: MutationRecord[],
    observer: MutationObserver
  ) => {
    console.log('mutationsList:', mutationsList, 'observer:', observer);
    mutationsList.forEach((mutation: MutationRecord, i: number) => {
      if (i === 0) {
        const message = mutation.addedNodes[0] as HTMLElement;
        const messageText = message.innerText;
        const messageTime = new Date().getTime();
        const messageUser = 'user';
        this._threadItems.push({
          id: messageTime.toString(),
          time: messageTime,
          user: messageUser,
          message: messageText,
        });
      }
      if (i === 1) {
        const message = mutation.addedNodes[0] as HTMLElement;
        const tempObserver = new MutationObserver(
          (mutationsList, observer) => {}
        );
        tempObserver.observe(message, { childList: true, subtree: true });

        console.log('message', message);
        const messageText = message.innerHTML;
        const messageTime = new Date().getTime();
        const messageUser = 'bot';
        this._threadItems.push({
          id: messageTime.toString(),
          time: messageTime,
          user: messageUser,
          message: messageText,
        });
      }
    });
    console.log('new thread items', this._threadItems);
  };

  debounceHandleMessages = debounce(this.handleMessages, 1000);

  destroyPageObserver() {
    this._observer?.disconnect();
  }
}

export default ChatGptThread;
