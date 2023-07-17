export function debounce(func: Function, timeout = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: [args: any]) => {
    clearTimeout(timer);
    // @ts-ignore
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

interface CodeBlock {
  code: string;
  codeRef: HTMLElement;
  copied: boolean;
  surroundingText: string;
  language: string;
}

interface ThreadPair {
  id: string;
  time: number;
  userMessage: string;
  botResponse: string;
  codeBlocks: CodeBlock[];
}

class ChatGptThread {
  _observer: MutationObserver | null = null;
  _threadItems: ThreadPair[] = [];
  _botRef: HTMLElement | null = null;
  _userRef: HTMLElement | null = null;
  _tempPair: ThreadPair | null = null;
  _lastEditedTime: NodeJS.Timeout | null = null;
  constructor() {
    this.init();
  }

  init() {
    this.initPageObserver();
  }

  initPageObserver() {
    const targetNode: Node | Element | null = document.body.querySelector(
      '.flex-col.text-sm.dark\\:bg-gray-800' // not sure if this will remain constant...
    );
    if (targetNode) {
      const config: MutationObserverInit = { childList: true, subtree: true };
      this._observer = new MutationObserver(this.handleMessages);
      this._observer.observe(targetNode, config);
    } else {
      setTimeout(() => this.initPageObserver(), 1000);
    }
  }

  handleMessages: MutationCallback = (
    mutationsList: MutationRecord[],
    observer: MutationObserver
  ) => {
    console.log(
      'mutationsList:',
      mutationsList,
      'observer:',
      observer,
      'this._lastEditedTime',
      this._lastEditedTime
    );
    this._tempPair = this._tempPair || {
      id: new Date().getTime().toString(),
      time: new Date().getTime(),
      userMessage: '',
      botResponse: '',
      codeBlocks: [],
    };

    // div holding user's initial query
    this._userRef =
      this._userRef || (mutationsList[0].addedNodes[0] as HTMLElement);

    // div holding bot's response
    this._botRef =
      this._botRef || (mutationsList[1].addedNodes[0] as HTMLElement);

    const hasPre =
      mutationsList[0].addedNodes.length &&
      mutationsList[0].addedNodes[0].nodeName === 'PRE';
    if (hasPre) {
      const preNode = mutationsList[0].addedNodes[0] as HTMLElement;
      const codeBlock = this.makeCodeBlock(preNode);
      this._tempPair = {
        ...this._tempPair,
        codeBlocks: [...this._tempPair.codeBlocks, codeBlock],
      };
    }
    this._lastEditedTime && clearTimeout(this._lastEditedTime);
    this._lastEditedTime = setTimeout(() => {
      this._tempPair = {
        ...this._tempPair,
        userMessage: this._userRef?.innerText || '',
        botResponse: this._botRef?.innerText || '',
        id: this._tempPair?.id || new Date().getTime().toString(),
        time: this._tempPair?.time || new Date().getTime(),
        codeBlocks: this._tempPair?.codeBlocks || [],
      };

      this._threadItems.push(this._tempPair);
      console.log('new thread items', this._threadItems);
      this._userRef = null;
      this._botRef = null;
      this._tempPair = null;
    }, 5000);
  };

  destroyPageObserver() {
    this._observer?.disconnect();
  }

  private attachListeners(preNode: HTMLElement) {
    const button = preNode.querySelector('button');
    button?.addEventListener('click', this.handleCopy);
    preNode.oncopy = this.handleCopy;
  }

  private handleCopy = (e: Event) => {
    console.log('e', e);
    const button = e.target as HTMLElement;
    console.log('copied from this button', button);
    const preNode = button?.parentElement?.parentElement?.parentElement;
    console.log('wtf', preNode);
    if (navigator.clipboard && navigator.clipboard.readText) {
      // Read the text from the clipboard
      navigator.clipboard
        .readText()
        .then((text) => {
          // Access the text read from the clipboard
          console.log('Clipboard text:', text);
          // Use the text as needed
        })
        .catch((error) => {
          // Handle any errors that occur during reading
          console.error('Error reading from clipboard:', error);
        });
    } else {
      // Clipboard API not supported by the browser
      console.error('Clipboard API not supported');
    }
  };

  private makeCodeBlock(preNode: HTMLElement) {
    const codeNode = preNode?.querySelector('code');
    const code = codeNode?.innerText || '';
    const codeRef = codeNode as HTMLElement;
    const surroundingText = codeRef?.innerText || '';
    const language = codeNode?.className || '';
    const codeBlock = {
      code,
      codeRef: preNode,
      copied: false,
      surroundingText,
      language,
    };
    console.log('adding this', codeBlock);
    this.attachListeners(preNode);
    return codeBlock;
  }
}

export default ChatGptThread;

// generic function to create a mutation observer
// createObserver(
//   functionToApply: MutationCallback,
//   selection: string,
//   node = document.body
// ) {
//   const foundNode = node.querySelector(selection);
//   if (foundNode) {
//     const config: MutationObserverInit = { childList: true, subtree: true };
//     const observer = new MutationObserver(functionToApply);
//     observer.observe(node, config);
//     return observer;
//   } else {
//     setTimeout(
//       () => this.createObserver(functionToApply, selection, node),
//       1000
//     );
//   }
// }
