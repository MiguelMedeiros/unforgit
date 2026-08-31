export interface MobileMenuState {
  pathname: string;
  isOpen: boolean;
}

export function createMobileMenuState(pathname: string): MobileMenuState {
  return { pathname, isOpen: false };
}

export function syncMobileMenuState(
  state: MobileMenuState,
  currentPath: string,
): MobileMenuState {
  return state.pathname === currentPath ? state : createMobileMenuState(currentPath);
}

export function toggleMobileMenuState(
  state: MobileMenuState,
  currentPath: string,
): MobileMenuState {
  const currentState = syncMobileMenuState(state, currentPath);
  return { ...currentState, isOpen: !currentState.isOpen };
}
