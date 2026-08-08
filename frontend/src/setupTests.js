// jest-dom adds custom matchers for asserting on DOM nodes, e.g.
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// jsdom (the jest test environment react-scripts uses) does not implement
// matchMedia, but App and FileDetail both call MUI's useMediaQuery, which
// calls it. Without this, every test touching those components throws.
window.matchMedia =
  window.matchMedia ||
  function matchMedia(query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };

// frontend/.env bakes REACT_APP_API_URL in as whatever the developer's LAN
// setup needs (see README); pin it to a fixed value here so test assertions
// on fetch URLs don't depend on that machine-specific setting.
process.env.REACT_APP_API_URL = "http://api.test";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
