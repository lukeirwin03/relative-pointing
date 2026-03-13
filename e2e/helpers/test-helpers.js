const API_URL = `http://localhost:${process.env.PORT || 5001}/api`;

/** Timeout for assertions that depend on the 2-second poll cycle */
const POLL_TIMEOUT = { timeout: 10000 };

/** Standard headers for JSON API requests */
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Generate a UUID v4 without external dependencies */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** POST /api/sessions — create a new session, returns { sessionId, roomCode, creatorId, creatorName } */
async function createSessionViaAPI(request, name) {
  // Retry on room_code collisions (small namespace ~2500 combinations)
  for (let attempt = 0; attempt < 5; attempt++) {
    const creatorId = generateUUID();
    const response = await request.post(`${API_URL}/sessions`, {
      headers: JSON_HEADERS,
      data: { creatorId, creatorName: name },
    });
    const data = await response.json();
    if (data.roomCode) return { ...data, creatorId };
    // Collision or transient error — brief pause and retry
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Failed to create session after 5 attempts');
}

/** POST /api/sessions/:roomCode/join */
async function joinSessionViaAPI(request, roomCode, name) {
  const userId = generateUUID();
  const response = await request.post(`${API_URL}/sessions/${roomCode}/join`, {
    headers: JSON_HEADERS,
    data: { userId, userName: name },
  });
  const data = await response.json();
  return { ...data, userId, userName: name };
}

/** GET /api/sessions/:roomCode — full session payload (retries on transient failures)
 *  @param {string} [userId] — if provided, updates the caller's last_seen_at (heartbeat)
 */
async function getSessionViaAPI(request, roomCode, userId) {
  const url = userId
    ? `${API_URL}/sessions/${roomCode}?userId=${encodeURIComponent(userId)}`
    : `${API_URL}/sessions/${roomCode}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await request.get(url);
    const data = await response.json();
    if (data.tasks) return data;
    // Transient failure (e.g. SQLITE_BUSY) — brief pause and retry
    await new Promise((r) => setTimeout(r, 200));
  }
  // Final attempt — return whatever we get
  const response = await request.get(url);
  return response.json();
}

/** POST /api/sessions/:roomCode/tasks/create-task */
async function createTaskViaAPI(request, roomCode, issueKey, title) {
  const response = await request.post(
    `${API_URL}/sessions/${roomCode}/tasks/create-task`,
    { headers: JSON_HEADERS, data: { issueKey, title } }
  );
  return response.json();
}

/** POST /api/sessions/:roomCode/columns */
async function createColumnViaAPI(request, roomCode, columnId, name, order) {
  const response = await request.post(
    `${API_URL}/sessions/${roomCode}/columns`,
    { headers: JSON_HEADERS, data: { columnId, name, order } }
  );
  return response.json();
}

/** PUT /api/sessions/:roomCode/tasks/:taskId */
async function moveTaskViaAPI(request, roomCode, taskId, columnId, assignedBy) {
  const response = await request.put(
    `${API_URL}/sessions/${roomCode}/tasks/${taskId}`,
    { headers: JSON_HEADERS, data: { columnId, assignedBy } }
  );
  return response.json();
}

/** DELETE /api/sessions/:roomCode/tasks/:taskId */
async function deleteTaskViaAPI(request, roomCode, taskId) {
  const response = await request.delete(
    `${API_URL}/sessions/${roomCode}/tasks/${taskId}`
  );
  return response.json();
}

/** PATCH /api/sessions/:roomCode/tasks/:taskId/color */
async function updateTaskColorViaAPI(request, roomCode, taskId, colorTag) {
  const response = await request.patch(
    `${API_URL}/sessions/${roomCode}/tasks/${taskId}/color`,
    { headers: JSON_HEADERS, data: { colorTag } }
  );
  return response.json();
}

/**
 * Create an isolated browser context with localStorage pre-set.
 * Returns { context, page, userId }.
 */
async function createUserContext(browser, userName) {
  const userId = generateUUID();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set localStorage before navigation
  await page.addInitScript(
    ({ uid, uname }) => {
      localStorage.setItem('userId', uid);
      localStorage.setItem('userName', uname);
    },
    { uid: userId, uname: userName }
  );

  return { context, page, userId };
}

/**
 * Create an isolated context, join the session via API, and navigate to the board.
 * Returns { context, page, userId }.
 */
async function createAuthenticatedUserInSession(
  browser,
  request,
  roomCode,
  userName
) {
  const { context, page, userId } = await createUserContext(browser, userName);

  // Join session via API
  await request.post(`${API_URL}/sessions/${roomCode}/join`, {
    headers: JSON_HEADERS,
    data: { userId, userName },
  });

  // Navigate to the session board
  await page.goto(`/session/${roomCode}`);
  await page.waitForSelector('text=Room Code:', { timeout: 10000 });

  return { context, page, userId };
}

/**
 * Create a browser context as the session creator (uses the actual creatorId).
 * Returns { context, page, userId }.
 */
async function createCreatorContext(browser, roomCode, creatorId, creatorName) {
  return openBrowserAsUser(browser, roomCode, creatorId, creatorName);
}

/**
 * Open a browser context with a specific userId (already joined via API).
 * Returns { context, page, userId }.
 */
async function openBrowserAsUser(browser, roomCode, userId, userName) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(
    ({ uid, uname }) => {
      localStorage.setItem('userId', uid);
      localStorage.setItem('userName', uname);
    },
    { uid: userId, uname: userName }
  );

  await page.goto(`/session/${roomCode}`);
  await page.waitForSelector('text=Room Code:', { timeout: 10000 });

  return { context, page, userId };
}

/** POST /api/sessions/:roomCode/start — start the session (creator only) */
async function startSessionViaAPI(request, roomCode, userId) {
  const response = await request.post(`${API_URL}/sessions/${roomCode}/start`, {
    headers: JSON_HEADERS,
    data: { userId },
  });
  return response.json();
}

/** POST /api/sessions/:roomCode/end-turn */
async function endTurnViaAPI(request, roomCode, userId) {
  const response = await request.post(
    `${API_URL}/sessions/${roomCode}/end-turn`,
    { headers: JSON_HEADERS, data: { userId } }
  );
  return response.json();
}

/** PATCH /api/sessions/:roomCode */
async function updateSessionViaAPI(request, roomCode, updates) {
  const response = await request.patch(`${API_URL}/sessions/${roomCode}`, {
    headers: JSON_HEADERS,
    data: updates,
  });
  return response.json();
}

/** POST /api/sessions/:roomCode/tasks/skip-top */
async function skipTopTaskViaAPI(request, roomCode) {
  const response = await request.post(
    `${API_URL}/sessions/${roomCode}/tasks/skip-top`,
    { headers: JSON_HEADERS }
  );
  return response.json();
}

/** POST /api/sessions/:roomCode/transfer-ownership */
async function transferOwnershipViaAPI(request, roomCode, userId, newOwnerId) {
  const response = await request.post(
    `${API_URL}/sessions/${roomCode}/transfer-ownership`,
    { headers: JSON_HEADERS, data: { userId, newOwnerId } }
  );
  return {
    status: response.status(),
    data: await response.json(),
  };
}

/** PUT /api/sessions/:roomCode/tasks/:taskId — raw response version for status code assertions */
async function moveTaskRawViaAPI(
  request,
  roomCode,
  taskId,
  columnId,
  assignedBy
) {
  const response = await request.put(
    `${API_URL}/sessions/${roomCode}/tasks/${taskId}`,
    { headers: JSON_HEADERS, data: { columnId, assignedBy } }
  );
  return {
    status: response.status(),
    data: await response.json(),
  };
}

/** Helper to sleep for a given number of milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  API_URL,
  POLL_TIMEOUT,
  generateUUID,
  createSessionViaAPI,
  joinSessionViaAPI,
  getSessionViaAPI,
  createTaskViaAPI,
  createColumnViaAPI,
  moveTaskViaAPI,
  moveTaskRawViaAPI,
  deleteTaskViaAPI,
  updateTaskColorViaAPI,
  createUserContext,
  createAuthenticatedUserInSession,
  startSessionViaAPI,
  endTurnViaAPI,
  updateSessionViaAPI,
  skipTopTaskViaAPI,
  transferOwnershipViaAPI,
  createCreatorContext,
  openBrowserAsUser,
  sleep,
};
