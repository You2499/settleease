import { describe, expect, it } from "vitest";

import {
  buildWelcomeToastModel,
  createLogoutMessage,
  parseLogoutMessage,
  resolveInitialView,
  shouldApplyLogoutMessage,
} from "../authFlow";

describe("resolveInitialView", () => {
  it("keeps a valid URL view over the saved last view", () => {
    expect(
      resolveInitialView({
        currentView: "analytics",
        lastActiveView: "addExpense",
        requestedView: "analytics",
        userRole: "admin",
      }),
    ).toEqual({
      deniedView: null,
      resolvedView: "analytics",
      restoredView: null,
    });
  });

  it("restores the saved last view when there is no URL view", () => {
    expect(
      resolveInitialView({
        currentView: "dashboard",
        lastActiveView: "addExpense",
        requestedView: null,
        userRole: "admin",
      }),
    ).toEqual({
      deniedView: null,
      resolvedView: "addExpense",
      restoredView: "addExpense",
    });
  });

  it("falls back to dashboard for inaccessible restored views", () => {
    expect(
      resolveInitialView({
        currentView: "dashboard",
        lastActiveView: "addExpense",
        requestedView: null,
        userRole: "user",
      }),
    ).toEqual({
      deniedView: null,
      resolvedView: "dashboard",
      restoredView: null,
    });
  });

  it("denies an inaccessible URL view", () => {
    expect(
      resolveInitialView({
        currentView: "addExpense",
        lastActiveView: "analytics",
        requestedView: "addExpense",
        userRole: "user",
      }),
    ).toEqual({
      deniedView: "addExpense",
      resolvedView: "dashboard",
      restoredView: null,
    });
  });
});

describe("buildWelcomeToastModel", () => {
  it("marks new users as seen and uses the new-user copy", () => {
    const model = buildWelcomeToastModel({
      profile: { has_seen_welcome_toast: false, should_show_welcome_toast: true },
      restoredInitialView: null,
      userName: "Gagan",
    });

    expect(model.title).toBe("Welcome to SettleEase!");
    expect(model.description).toContain("Hi Gagan!");
    expect(model.profileUpdates).toEqual({
      has_seen_welcome_toast: true,
      should_show_welcome_toast: false,
    });
  });

  it("uses restored-view copy for returning users with a restored view", () => {
    const model = buildWelcomeToastModel({
      profile: { has_seen_welcome_toast: true, should_show_welcome_toast: false },
      restoredInitialView: "addExpense",
      userName: "Gagan",
    });

    expect(model.title).toBe("Welcome back!");
    expect(model.description).toContain("Session restored to Add Expense");
    expect(model.action).toBe("dashboard");
    expect(model.profileUpdates).toEqual({});
  });

  it("uses generic copy for returning users without a restored view", () => {
    const model = buildWelcomeToastModel({
      profile: { has_seen_welcome_toast: true, should_show_welcome_toast: false },
      restoredInitialView: null,
      userName: "Gagan",
    });

    expect(model.title).toBe("Welcome back!");
    expect(model.description).toBe("You've successfully signed in to SettleEase.");
    expect(model.action).toBeNull();
  });
});

describe("logout messages", () => {
  it("parses and applies a fresh logout message", () => {
    const message = parseLogoutMessage(JSON.stringify(createLogoutMessage("user-1", 100)));

    expect(message).toEqual({
      issuedAt: 100,
      type: "settleease:logout",
      userId: "user-1",
    });
    expect(
      shouldApplyLogoutMessage({
        currentUserId: "user-1",
        lastHandledIssuedAt: 99,
        message,
      }),
    ).toBe(true);
  });

  it("does not re-apply an already handled logout message", () => {
    const message = createLogoutMessage("user-1", 100);

    expect(
      shouldApplyLogoutMessage({
        currentUserId: "user-1",
        lastHandledIssuedAt: 100,
        message,
      }),
    ).toBe(false);
  });

  it("ignores logout messages for a different known user", () => {
    const message = createLogoutMessage("user-1", 100);

    expect(
      shouldApplyLogoutMessage({
        currentUserId: "user-2",
        lastHandledIssuedAt: 0,
        message,
      }),
    ).toBe(false);
  });
});
