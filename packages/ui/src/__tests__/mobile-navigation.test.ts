import { describe, expect, it } from "vitest";
import {
  createMobileMenuState,
  syncMobileMenuState,
  toggleMobileMenuState,
} from "../utils/mobile-navigation";

describe("mobile navigation state", () => {
  it("toggles the menu for the current pathname", () => {
    const closed = createMobileMenuState("/memories");
    const open = toggleMobileMenuState(closed, "/memories");

    expect(open).toEqual({ pathname: "/memories", isOpen: true });
    expect(toggleMobileMenuState(open, "/memories")).toEqual(closed);
  });

  it("stays closed after navigating away and returning", () => {
    let state = toggleMobileMenuState(
      createMobileMenuState("/memories"),
      "/memories",
    );

    state = syncMobileMenuState(state, "/settings");
    state = syncMobileMenuState(state, "/memories");

    expect(state).toEqual({ pathname: "/memories", isOpen: false });
  });
});
