import { describe, expect, it } from "vitest";
import {
  isMobileMenuOpen,
  toggleMobileMenuPath,
} from "../utils/mobile-navigation";

describe("mobile navigation state", () => {
  it("closes an open menu when navigation changes the pathname", () => {
    expect(isMobileMenuOpen("/memories", "/settings")).toBe(false);
  });

  it("keeps an open menu visible while the pathname is unchanged", () => {
    expect(isMobileMenuOpen("/memories", "/memories")).toBe(true);
  });

  it("toggles the menu for the current pathname", () => {
    expect(toggleMobileMenuPath(null, "/memories")).toBe("/memories");
    expect(toggleMobileMenuPath("/memories", "/memories")).toBeNull();
  });
});
