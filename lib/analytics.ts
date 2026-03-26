import type PostHog from 'posthog-react-native';

export const Events = {
  IDENTIFICATION_STARTED: 'identification_started',
  IDENTIFICATION_COMPLETED: 'identification_completed',
  IDENTIFICATION_FAILED: 'identification_failed',
  SIGHTING_SAVED: 'sighting_saved',
  PAYWALL_SHOWN: 'paywall_shown',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_CANCELLED: 'purchase_cancelled',
  PURCHASE_RESTORED: 'purchase_restored',
  SIGNUP_COMPLETED: 'signup_completed',
  SIGNIN_COMPLETED: 'signin_completed',
  SIGNOUT_COMPLETED: 'signout_completed',
  ACCOUNT_DELETED: 'account_deleted',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  SHARE_CARD_SAVED: 'share_card_saved',
  SHARE_CARD_SHARED: 'share_card_shared',
  ENHANCER_USED: 'enhancer_used',
} as const;

class Analytics {
  private posthog: PostHog | null = null;

  init(instance: PostHog) {
    this.posthog = instance;
  }

  capture(event: string, properties?: Record<string, any>) {
    this.posthog?.capture(event, properties);
  }

  identify(userId: string, properties?: Record<string, any>) {
    this.posthog?.identify(userId, properties);
  }

  reset() {
    this.posthog?.reset();
  }
}

export const analytics = new Analytics();
