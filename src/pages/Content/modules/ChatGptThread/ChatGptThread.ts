export function debounce(func: Function, timeout = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: [args: any]) => {
    clearTimeout(timer);
    // @ts-ignore
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

enum HowCopied {
  BUTTON = 'BUTTON',
  SELECTION = 'SELECTION',
}

interface CodeBlock {
  code: string;
  codeRef: HTMLElement;
  copied: boolean;
  surroundingText: string;
  language: string;
  parentId: string;
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
  _tempUserMessage: string | null = null;
  _tempPair: ThreadPair | null = null;
  _lastEditedTime: NodeJS.Timeout | null = null;
  _botObserver: MutationObserver | null = null;
  constructor(readonly _id: string) {
    this.init();
  }

  init() {
    // console.log('calling initPageObserver');
    this.initPageObserver();
  }

  listenForUserText() {
    const targetNode: HTMLElement | null =
      document.body.querySelector('#prompt-textarea');
    if (targetNode) {
      console.log('targetNode', targetNode);
      targetNode.addEventListener('input', debounce(this.handleUserInput, 100));
    }
  }

  handleUserInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    // console.log('target', target, 'e', e);
    const value = target.value;
    // console.log('value', value);
    this._tempUserMessage = value;
  };

  initPageObserver() {
    const targetNode: HTMLElement | null = document.body.querySelector(
      '.flex-col.text-sm.dark\\:bg-gray-800' // not sure if this will remain constant...
    );
    // console.log('targetNode', targetNode?.id);
    if (targetNode && (targetNode.id === this._id || targetNode.id === '')) {
      // console.log(
      //   'targetNode',
      //   targetNode,
      //   'this._threadItems',
      //   this._threadItems
      // );
      targetNode.setAttribute('id', this._id);
      if (!this._threadItems.length) {
        this.initThreadItems(targetNode);
        // console.log('thread items', this._threadItems);
      }
      const config: MutationObserverInit = {
        childList: true,
        subtree: true,
        // characterData: true,
      };
      this._observer = new MutationObserver(this.handleMessages);
      this._observer.observe(targetNode, config);
      this.listenForUserText();
    } else {
      setTimeout(() => this.initPageObserver(), 5000);
    }
  }

  private reset() {
    this._userRef = null;
    this._botRef = null;
    this._tempPair = null;
    this._tempUserMessage = null;
    console.log('resetting', this);
    this._botObserver?.disconnect();
    // console.log('disconnected');
  }

  addToThread(mutationsList: MutationRecord[], observer: MutationObserver) {
    this._tempPair = this._tempPair || {
      id: `${new Date().getTime().toString()}-${this._tempUserMessage}`,
      time: new Date().getTime(),
      userMessage: '',
      botResponse: '',
      codeBlocks: [],
    };

    // div holding user's initial query
    // this._userRef =
    //   this._userRef || (mutationsList[0].addedNodes[0] as HTMLElement);

    // // div holding bot's response
    // this._botRef =
    //   this._botRef || (mutationsList[1].addedNodes[0] as HTMLElement);

    const hasPre =
      mutationsList[0].addedNodes.length &&
      mutationsList[0].addedNodes[0].nodeName === 'PRE';
    if (hasPre) {
      const preNode = mutationsList[0].addedNodes[0] as HTMLElement;
      const codeBlock = this.makeCodeBlock(preNode, this._tempPair.id);
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
      // console.log('this', this);

      this._threadItems.push(this._tempPair);
      console.log('new thread items', this._threadItems);
      this.reset();
    }, 5000);
  }

  handleMessages: MutationCallback = (
    mutationsList: MutationRecord[],
    observer: MutationObserver
  ) => {
    if (!mutationsList.length || mutationsList.length === 1) return;
    mutationsList.forEach((mutation) => {
      // console.log('parent mutation', mutation);
      if (
        mutation.addedNodes &&
        Array.from(mutation.addedNodes.values()).some(
          (n) =>
            (n as HTMLElement).innerText === this._tempUserMessage &&
            this._tempUserMessage.length
        )
      ) {
        const addedNodes = Array.from(mutation.addedNodes.values());
        // console.log('addedNodes', addedNodes, 'this', this);
        const nodeWithMessage = addedNodes.find(
          (n) =>
            (n as HTMLElement).innerText === this._tempUserMessage &&
            this._tempUserMessage.length
        ) as HTMLElement;
        if (nodeWithMessage) {
          this._userRef = nodeWithMessage;
          this._botRef = nodeWithMessage.nextSibling as HTMLElement;

          // const tempObserver = new MutationObserver((mutations, observer) =>
          //   this.addToThread(mutations, observer)
          // );

          this._botObserver = new MutationObserver((mutations, observer) =>
            this.addToThread(mutations, observer)
          );
          this._botObserver.observe(
            nodeWithMessage.nextSibling as HTMLElement,
            {
              childList: true,
              subtree: true,
              characterData: true,
            }
          );
          // console.log('THIS!!!', this);
          // this.addToThread(mutationsList, observer);
        }
      }
    });
    // if (mutationsList.length === 2) {
    //   this.handleOngoingThread(mutationsList, observer);
    //   return;
    // } else {
    // }
  };

  private initThreadItems(targetNode: HTMLElement) {
    targetNode.childNodes.forEach((node, i) => {
      if (i % 2 === 0) {
        const userMessage = (node as HTMLElement).innerText;
        let botMessage = '';
        let codeBlocks: CodeBlock[] = [];
        const id = `${new Date().getTime().toString()}-${userMessage}`;
        if (targetNode.childNodes.length > i + 1) {
          const nextNode = targetNode.childNodes[i + 1] as HTMLElement;
          botMessage = nextNode.innerText;
          const preNodes = nextNode.querySelectorAll('pre');
          codeBlocks = Array.from(preNodes).map((preNode) =>
            this.makeCodeBlock(preNode as HTMLElement, id)
          );
        }
        const pair: ThreadPair = {
          id,
          time: new Date().getTime(),
          userMessage,
          botResponse: botMessage,
          codeBlocks,
        };
        this._threadItems.push(pair);
      }
    });
  }

  destroyPageObserver() {
    this._observer?.disconnect();
  }

  private attachListeners(preNode: HTMLElement, parentId: string) {
    const button = preNode.querySelector('button');
    // console.log('butt', button, 'preNode', preNode);
    button?.addEventListener('click', (e: Event) =>
      this.handleCopy(e, preNode, HowCopied.BUTTON, parentId)
    );
    preNode.oncopy = (e) =>
      this.handleCopy(e, preNode, HowCopied.SELECTION, parentId);
  }

  private handleCopy = (
    e: Event,
    preNode: HTMLElement,
    howCopied: HowCopied,
    parentId: string
  ) => {
    console.log('e', e);
    // const button = e.target as HTMLElement;
    // console.log('copied from this button', button);
    // const preNode = button?.parentElement?.parentElement?.parentElement;
    // console.log('wtf', preNode);
    if (navigator.clipboard && navigator.clipboard.readText) {
      // Read the text from the clipboard

      navigator.clipboard
        .readText()
        .then((text) => {
          let textToSend = '';
          if (howCopied === HowCopied.BUTTON) {
            console.log('text', text, 'preNode', preNode.innerText);
            const splitter = preNode.innerText.includes('Copy code')
              ? 'Copy code'
              : 'Copied!';
            const cleanText = preNode.innerText.split(splitter)[1].trim() || '';
            // console.log(
            //   'cleanText',
            //   cleanText,
            //   'text',
            //   text,
            //   'preNode',
            //   preNode.innerText
            // );
            if (text.trim() !== cleanText.trim()) {
              textToSend = cleanText;
            } else {
              textToSend = text;
            }
          } else if (howCopied === HowCopied.SELECTION) {
            const selection = window.getSelection();
            if (selection) {
              textToSend =
                text.trim() === selection.toString().trim()
                  ? text
                  : selection.toString();
            }
          }
          // Access the text read from the clipboard
          console.log('Clipboard text:', text);
          chrome.runtime.sendMessage({
            message: 'copyCode',
            payload: {
              thread: this,
              code: textToSend,
              messageCopied: this._threadItems.find((t) => t.id === parentId),
            },
          });
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
    if (howCopied === HowCopied.BUTTON) {
      setTimeout(() => {
        this.attachListeners(preNode, parentId);
      }, 4000);
    }
  };

  private makeCodeBlock(preNode: HTMLElement, parentId: string): CodeBlock {
    // const codeNode = preNode?.querySelector('code');
    const code = preNode?.innerText || '';
    const codeRef = preNode as HTMLElement;
    const surroundingText = codeRef?.innerText || '';
    const language = preNode?.innerText.split(' ')[0] || '';
    const codeBlock = {
      code,
      codeRef: preNode,
      copied: false,
      surroundingText,
      language,
      parentId,
    };
    // console.log('adding this', codeBlock);
    this.attachListeners(preNode, parentId);
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
