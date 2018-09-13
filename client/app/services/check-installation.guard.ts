import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from "@angular/router";
import { Observable, of } from "rxjs";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { map, catchError, tap } from "rxjs/operators";

@Injectable({
  providedIn: "root"
})
export class CheckInstallationGuard implements CanActivate {
  constructor(private http: HttpClient, private router: Router) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.http.get<boolean>("/api/installation/status").pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.error instanceof ErrorEvent) {
          return of(false);
        } else {
          if (err.error === "AlreadyInstalled" || err.status === 404) {
            return of(true);
          }
          return of(false);
        }
      }),
      tap(installed => {
        if (installed === false) {
          this.router.navigate(["install"]);
        }
      })
    );
  }
}
