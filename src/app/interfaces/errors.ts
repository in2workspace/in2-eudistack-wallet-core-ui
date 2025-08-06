import { HttpErrorResponse } from "@angular/common/http";

export interface ExtendedHttpErrorResponse extends HttpErrorResponse{
  title: string;
  path: string;
}