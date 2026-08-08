// Shared helpers for component tests. Not itself a test file: react-scripts'
// jest testMatch only picks up src/**/__tests__/** and src/**/*.{spec,test}.js,
// so this file (and anything it exports) is never run as a suite on its own.
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Renders `ui` inside a MemoryRouter. Pass `path` (a react-router path
// pattern, e.g. "/files/:id") when the component under test calls
// useParams/useLocation and needs to be reached via a matching <Route> rather
// than rendered directly -- App itself has no Router (that lives in
// index.js), so every component test needs one of these.
export function renderWithRouter(ui, { route = "/", path } = {}) {
  if (path) {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>,
    );
  }
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

// Stubs global.fetch for one test. `routes` is keyed by "METHOD /pathname"
// (matched against the request with its query string stripped) or, if you
// need to assert on query params too, "METHOD /pathname?query". A route's
// value is either the JSON body to resolve with, or a function that receives
// the fetch `init` and returns (or resolves to) the JSON body -- useful when
// a handler needs to see the request body/method.
//
// Components here call the same endpoint repeatedly (e.g. FileDetail's
// refresh() re-fetches on every tag edit), so routes are looked up fresh on
// every call rather than consumed like a mockResolvedValueOnce queue.
//
// An unmatched request throws instead of silently resolving undefined, so a
// missing route fails the test that triggered it rather than the next one.
export function mockApi(routes) {
  const fetchMock = jest.fn(async (url, init = {}) => {
    const method = (init.method || "GET").toUpperCase();
    const parsed = new URL(url, "http://api.test");
    const withQuery = `${method} ${parsed.pathname}${parsed.search}`;
    const pathOnly = `${method} ${parsed.pathname}`;
    const key = withQuery in routes ? withQuery : pathOnly;
    const handler = routes[key];
    if (!handler) {
      throw new Error(`mockApi: no handler registered for ${withQuery}`);
    }
    const body = typeof handler === "function" ? await handler(init) : handler;
    return { ok: true, status: 200, json: async () => body };
  });
  global.fetch = fetchMock;
  return fetchMock;
}

let nextFileId = 1;

// Mirrors the shape backend/app.py returns for a File (GET /files,
// GET /files/<id>): {id, path, type, thumbnail_type, tags: [{id, name}]}.
export function makeFile(overrides = {}) {
  return {
    id: nextFileId++,
    path: "C:\\photos\\sample.jpg",
    type: "image",
    thumbnail_type: "image",
    tags: [],
    ...overrides,
  };
}
