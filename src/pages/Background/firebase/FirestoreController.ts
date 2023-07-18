// import { AuthenticationSession, Disposable, Uri } from 'vscode';
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  CollectionReference,
  Firestore,
  collection,
  getFirestore,
  query,
  where,
  getDocs,
  // DocumentData,
} from 'firebase/firestore';
import { Functions, getFunctions } from 'firebase/functions';
import {
  Auth,
  User,
  getAuth,
  signInWithPopup,
  GithubAuthProvider,
  signInWithRedirect,
  signInWithEmailAndPassword,
} from 'firebase/auth';
// import { Container } from '../../container';
// import * as dotenv from 'dotenv';
// import { getUserGithubData } from './functions/cloudFunctions';
// import { signInWithGithubCredential } from './functions/authFunctions';
// import { DataSourceType } from '../timeline/TimelineEvent';

// @ts-ignore
import { config } from './secrets.app.js';

enum DataSourceType {
  FIRESTORE = 'FIRESTORE',
}

export type DB_REFS =
  | 'users'
  | 'annotations'
  | 'vscode-annotations'
  | 'commits'
  | 'web-meta';

export const DB_COLLECTIONS: { [key: string]: DB_REFS } = {
  USERS: 'users',
  WEB_ANNOTATIONS: 'annotations',
  CODE_ANNOTATIONS: 'vscode-annotations',
  COMMITS: 'commits',
  WEB_META: 'web-meta',
};

class FirestoreController {
  // _disposable: Disposable;
  readonly _firebaseApp: FirebaseApp | undefined;
  readonly _firestore: Firestore | undefined;
  readonly _functions: Functions | undefined;
  readonly _auth: Auth | undefined;
  _user: User | undefined;
  readonly _refs: Map<DB_REFS, CollectionReference> | undefined;
  constructor() {
    // super(() => this.dispose());
    // this._disposable = Disposable.from();
    this._firebaseApp = this.initFirebaseApp();
    if (this._firebaseApp) {
      this._firestore = getFirestore(this._firebaseApp);
      this._functions = getFunctions(this._firebaseApp);
      this._auth = getAuth(this._firebaseApp);
      this._refs = this.initRefs();
    }
  }

  get firebaseApp() {
    return this._firebaseApp;
  }

  get functions() {
    return this._functions;
  }

  get auth() {
    return this._auth;
  }

  public static create() {
    const firestoreController = new FirestoreController();
    firestoreController.initListeners();
    return firestoreController;
  }

  initListeners() {
    chrome.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        if (request.message === 'signin') {
          await this.initAuth();
        }
        if (request.message === 'copyCode') {
          console.log('got it', request);
        }
      }
    );
  }

  private initFirebaseApp() {
    try {
      if (!config) {
        throw new Error('Firestore Controller: secrets.app.js not found');
      }
      return initializeApp(config); // consider making event emit so that other classes can listen for this
      // }
    } catch (e) {
      throw new Error('Firestore Controller: could not init');
    }
  }

  private initRefs() {
    const refs = new Map<DB_REFS, CollectionReference>();
    if (this._firestore !== undefined) {
      const firestore: Firestore = this._firestore; // stupid typescript
      Object.keys(DB_COLLECTIONS).forEach((key) => {
        const ref = collection(firestore, DB_COLLECTIONS[key]);
        refs.set(DB_COLLECTIONS[key], ref);
      });
    }
    return refs;
  }

  private async initAuth() {
    if (this._auth === undefined) {
      throw new Error('Firestore Controller: auth not initialized');
    }
    try {
      if (this._user) {
        // return this._user;
        await this._auth.signOut();
      }
      const githubAuth = new GithubAuthProvider();
      const result = await signInWithPopup(this._auth, githubAuth);
      const { user } = result;
      console.log('user', user);
      if (!user) {
        throw new Error('Firestore Controller: could not retrieve user data');
      } else {
        this._user = user;
        return user;
      }
    } catch (e: any) {
      throw new Error('Firestore Controller: could not sign in' + e);
    }
  }

  public async query(id: string) {
    if (!this._refs) {
      return [];
    }
    const arr = (
      await Promise.all(
        Array.from(this._refs).map(async (refMap) => {
          const [refName, ref] = refMap;
          const docRefs = query(ref, where('codeId', '==', id));
          const docs = await getDocs(docRefs);
          const formattedArr = docs.docs.map((doc) => {
            return {
              ...doc.data(),
              refType: refName,
              refSource: DataSourceType.FIRESTORE,
            };
          });
          return formattedArr;
        })
      )
    ).flat();
    return arr;
  }

  // dispose() {
  //     this._disposable.dispose();
  // }
}

export default FirestoreController;
