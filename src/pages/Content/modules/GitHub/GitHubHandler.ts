interface Repo {
  name: string;
  owner: string;
  branch: string;
  commit: string;
  stars?: number;
  version?: string;
  readme?: string;
}

interface Code {
  language: string;
  code: string;
  filename: string;
  url?: string;
  startLine?: number;
  endLine?: number;
}

const SELECTORS = {
  REPO_HOME_HASH: '.f6.Link--secondary.text-mono.ml-2.d-none.d-lg-inline',
};

const SimpleRepoRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/;

const RepoRegex =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(tree)\/(main|[a-fA-F0-9]{40})(?:\/(.+))?$/;

const CommitRegex =
  /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/commit\/(main|[a-fA-F0-9]{40})$/;

const FileRegex =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(main|[a-fA-F0-9]{40})\/(.+)$/;

class GitHubHandler {
  _repo: Repo | undefined;
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
        console.log(
          'complex',
          url.match(RepoRegex),
          'simple',
          url.match(SimpleRepoRegex)
        );
        if (RepoRegex.test(url)) {
          const repo = this.complexParseRepo(url);
          if (repo) {
            this._repo = repo;
          }
        } else if (FileRegex.test(url)) {
          this.parseFile(url);
        } else if (SimpleRepoRegex.test(url)) {
          const repo = this.simpleParseRepo(url);
          if (repo) {
            this._repo = repo;
          }
        }
      }
    });
  }

  simpleParseRepo(url: string): Repo | undefined {
    const urlParts = url.split('/');
    const owner = urlParts[3];
    const name = urlParts[4];
    const branch = 'main';
    const commit = (
      document.querySelector(SELECTORS.REPO_HOME_HASH) as HTMLElement
    )?.innerText;
    console.log('parseRepo', {
      owner,
      name,
      branch,
      commit,
    });
    return {
      owner,
      name,
      branch,
      commit,
    };
  }

  complexParseRepo(url: string, branchName?: string): Repo | undefined {
    // const urlParts = url.split('/');
    // const owner = urlParts[3];
    // const name = urlParts[4];
    // const branch = branchName || 'main';
    // const commit = (
    //   document.querySelector(SELECTORS.REPO_HOME_HASH) as HTMLElement
    // )?.innerText;
    // console.log('parseRepo', {
    //   owner,
    //   name,
    //   branch,
    //   commit,
    // });
    const regexData = url.match(RepoRegex);
    if (!regexData) {
      return;
    }
    const [copyUrl, owner, repoName, branch, commit] = regexData;
    return {
      owner,
      name: repoName,
      branch,
      commit,
    };
  }

  parseFile(url: string): void {
    console.log('parseFile', url, url.match(FileRegex));
    const regexData = url.match(FileRegex);
    if (!regexData) {
      return;
    }
    const [copyUrl, owner, repoName, hash, filePath] = regexData;
    if (!this._repo) {
      this._repo = {
        owner,
        name: repoName,
        branch: hash,
        commit: hash,
      };
    }
    const fileContent = document.querySelector('[aria-label="file content"]');
    console.log('fileContent', fileContent);

    if (fileContent) {
      fileContent.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (selection) {
          const code = selection.toString();
          console.log('code', code);
          this._copiedCode = {
            language: filePath.split('.').pop() || '',
            code,
            filename: filePath,
            url: copyUrl,
          };
        }
        console.log('copied code', this._copiedCode);
      });
    }
    const button = document.querySelector('[aria-label="Copy raw content"]');
    if (button) {
      button.addEventListener('click', (e) => {
        console.log('button clicked');
        if (fileContent) {
          const code = (fileContent as HTMLTextAreaElement).value;
          console.log('button code', code);
          this._copiedCode = {
            language: filePath.split('.').pop() || '',
            code,
            filename: filePath,
            url: copyUrl,
          };
        }
        console.log('copied code', this._copiedCode);
      });
    }
  }
}

export default GitHubHandler;
