// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { AuthUser, ApiClient } from '$lib/api-client';

declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
    }

    interface Locals {
      user: AuthUser | null;
      api: ApiClient;
    }

    interface PageData {
      user: AuthUser | null;
    }

    // interface PageState {}
    // interface Platform {}
  }
}

export {};
