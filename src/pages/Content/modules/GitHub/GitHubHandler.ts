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
  startLine?: number;
  endLine?: number;
}

const RepoRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+$/;

const CommitRegex =
  /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/commit\/(main|[a-fA-F0-9]{40})$/;

const FileRegex =
  /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/blob\/(main|[a-fA-F0-9]{40})\/.*$/;

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
        if (RepoRegex.test(url)) {
          const repo = this.parseRepo(url);
          if (repo) {
            this._repo = repo;
          }
        } else if (FileRegex.test(url)) {
          this.parseFile(url);
        }
      }
    });
  }

  parseRepo(url: string): Repo | undefined {
    const urlParts = url.split('/');
    const owner = urlParts[3];
    const name = urlParts[4];
    const branch = urlParts[6];
    const commit = urlParts[7];
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

  parseFile(url: string): void {
    console.log('parseFile', url);
    const fileContent = document.querySelector('[aria-label="file content"]');
    console.log('fileContent', fileContent);
    if (fileContent) {
      fileContent.addEventListener('copy', (e) => {
        const selection = window.getSelection();
        if (selection) {
          const code = selection.toString();
          console.log('code', code);
        }
      });
    }
    const button = document.querySelector('[aria-label="Copy raw content"]');
    if (button) {
      button.addEventListener('click', (e) => {
        console.log('button clicked');
        if (fileContent) {
          const code = (fileContent as HTMLTextAreaElement).value;
          console.log('button code', code);
        }
      });
    }
  }
}

export default GitHubHandler;
