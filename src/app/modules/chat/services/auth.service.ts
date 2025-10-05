import {inject, Injectable, signal} from "@angular/core";
import {Auth, onAuthStateChanged, signInWithPopup, signOut, User} from "@angular/fire/auth";
import {GoogleAuthProvider} from '@firebase/auth';

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    constructor() {
        onAuthStateChanged(this.auth, (user) => {
            this.dpUserAuthenticated.set(user);
        });
    }

    /**
     * @description Firebase auth instance
     */
    private auth = inject(Auth);

    /**
     * @description Dispatch user authenticated signal
     */
    private dpUserAuthenticated = signal<User | null>(null);

    /**
     * @description Listen to auth state changes
     */
    listenUserAuthenticated = this.dpUserAuthenticated.asReadonly();

    /**
     * @description Login with Google account
     */
    loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        signInWithPopup(this.auth, provider).then(result => result.user)
    }

    /**
     * @description Logout the current user
     */
    logout(): Promise<void> {
        return signOut(this.auth);
    }
}
