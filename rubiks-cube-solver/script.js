/**
 * Rubik's Cube State Management
 *
 * Core module representing the cube's state using a 1D array of 54 elements.
 * This design optimizes for performance in graph traversal algorithms by:
 * - Using a flat array for O(1) access and minimal memory overhead
 * - Avoiding nested structures that complicate state comparison
 * - Enabling efficient state hashing for visited set operations
 */

// ============================================================================
// COLOR ENUMERATION
// ============================================================================
const COLORS = Object.freeze({
  WHITE: "W",
  YELLOW: "Y",
  GREEN: "G",
  BLUE: "B",
  RED: "R",
  ORANGE: "O",
});

// ============================================================================
// FACE ENUMERATION
// ============================================================================
const FACES = Object.freeze({
  UP: "U", // White center (typically)
  RIGHT: "R", // Red center (typically)
  FRONT: "F", // Green center (typically)
  DOWN: "D", // Yellow center (typically)
  LEFT: "L", // Orange center (typically)
  BACK: "B", // Blue center (typically)
});

// ============================================================================
// FACE INDICES IN 1D ARRAY
// ============================================================================
// The 1D array is organized as 6 faces of 9 stickers each (3x3 grid per face)
// Index ranges for each face:
const FACE_INDICES = Object.freeze({
  [FACES.UP]: { start: 0, end: 8 }, // Indices 0-8
  [FACES.RIGHT]: { start: 9, end: 17 }, // Indices 9-17
  [FACES.FRONT]: { start: 18, end: 26 }, // Indices 18-26
  [FACES.DOWN]: { start: 27, end: 35 }, // Indices 27-35
  [FACES.LEFT]: { start: 36, end: 44 }, // Indices 36-44
  [FACES.BACK]: { start: 45, end: 53 }, // Indices 45-53
});

// ============================================================================
// SOLVED STATE CONFIGURATION
// ============================================================================
// Standard color scheme for a solved cube:
// Up: White, Right: Red, Front: Green, Down: Yellow, Left: Orange, Back: Blue
const SOLVED_STATE = Object.freeze([
  // Up face (0-8) - White
  COLORS.WHITE,
  COLORS.WHITE,
  COLORS.WHITE,
  COLORS.WHITE,
  COLORS.WHITE,
  COLORS.WHITE,
  COLORS.WHITE,
  COLORS.WHITE,
  COLORS.WHITE,

  // Right face (9-17) - Red
  COLORS.RED,
  COLORS.RED,
  COLORS.RED,
  COLORS.RED,
  COLORS.RED,
  COLORS.RED,
  COLORS.RED,
  COLORS.RED,
  COLORS.RED,

  // Front face (18-26) - Green
  COLORS.GREEN,
  COLORS.GREEN,
  COLORS.GREEN,
  COLORS.GREEN,
  COLORS.GREEN,
  COLORS.GREEN,
  COLORS.GREEN,
  COLORS.GREEN,
  COLORS.GREEN,

  // Down face (27-35) - Yellow
  COLORS.YELLOW,
  COLORS.YELLOW,
  COLORS.YELLOW,
  COLORS.YELLOW,
  COLORS.YELLOW,
  COLORS.YELLOW,
  COLORS.YELLOW,
  COLORS.YELLOW,
  COLORS.YELLOW,

  // Left face (36-44) - Orange
  COLORS.ORANGE,
  COLORS.ORANGE,
  COLORS.ORANGE,
  COLORS.ORANGE,
  COLORS.ORANGE,
  COLORS.ORANGE,
  COLORS.ORANGE,
  COLORS.ORANGE,
  COLORS.ORANGE,

  // Back face (45-53) - Blue
  COLORS.BLUE,
  COLORS.BLUE,
  COLORS.BLUE,
  COLORS.BLUE,
  COLORS.BLUE,
  COLORS.BLUE,
  COLORS.BLUE,
  COLORS.BLUE,
  COLORS.BLUE,
]);

// ============================================================================
// DIRECTION ENUMERATION
// ============================================================================
const DIRECTION = Object.freeze({
  CLOCKWISE: 1,
  COUNTER_CLOCKWISE: -1,
});

// ============================================================================
// FACE ROTATION PERMUTATIONS (90° CLOCKWISE)
// ============================================================================
// Each face rotation has two components:
// 1. The face itself rotates (9 indices permute)
// 2. Adjacent rows/columns from neighboring faces cycle

// Face rotation: 3x3 grid 90° clockwise
// Grid indices: 0 1 2
//               3 4 5
//               6 7 8
// After 90° CW: 6 3 0
//               7 4 1
//               8 5 2
const FACE_ROTATION_CW = Object.freeze([6, 3, 0, 7, 4, 1, 8, 5, 2]);

// Face rotation: 3x3 grid 90° counter-clockwise
// After 90° CCW: 2 5 8
//                1 4 7
//                0 3 6
const FACE_ROTATION_CCW = Object.freeze([2, 5, 8, 1, 4, 7, 0, 3, 6]);

// ============================================================================
// ADJACENT FACE CYCLES FOR EACH ROTATION
// ============================================================================
// When a face rotates, the adjacent rows/columns from neighboring faces cycle.
// Each entry is an array of indices that cycle in the specified order.
// For clockwise: [a, b, c, d] means a→b, b→c, c→d, d→a
// For counter-clockwise: [a, b, c, d] means a→d, d→c, c→b, b→a

const ROTATION_CYCLES = Object.freeze({
  // UP (U) rotation: affects top row of Front, Right, Back, Left
  // Clockwise: Front top row → Left top row → Back top row → Right top row → Front top row
  [FACES.UP]: {
    clockwise: [
      18,
      19,
      20, // Front top row
      36,
      37,
      38, // Left top row
      45,
      46,
      47, // Back top row
      9,
      10,
      11, // Right top row
    ],
    counterClockwise: [
      18,
      19,
      20, // Front top row
      9,
      10,
      11, // Right top row
      45,
      46,
      47, // Back top row
      36,
      37,
      38, // Left top row
    ],
  },

  // DOWN (D) rotation: affects bottom row of Front, Right, Back, Left
  // Clockwise: Front bottom row → Right bottom row → Back bottom row → Left bottom row → Front bottom row
  [FACES.DOWN]: {
    clockwise: [
      24,
      25,
      26, // Front bottom row
      9,
      10,
      11, // Right bottom row (indices 15,16,17 actually - corrected below)
      51,
      52,
      53, // Back bottom row
      42,
      43,
      44, // Left bottom row
    ],
    counterClockwise: [
      24,
      25,
      26, // Front bottom row
      42,
      43,
      44, // Left bottom row
      51,
      52,
      53, // Back bottom row
      15,
      16,
      17, // Right bottom row
    ],
  },

  // RIGHT (R) rotation: affects right column of Up, Front, Down, Back
  // Clockwise: Up right col → Front right col → Down right col → Back left col (reversed) → Up right col
  [FACES.RIGHT]: {
    clockwise: [
      2,
      5,
      8, // Up right column
      20,
      23,
      26, // Front right column
      29,
      32,
      35, // Down right column
      53,
      50,
      47, // Back left column (reversed)
    ],
    counterClockwise: [
      2,
      5,
      8, // Up right column
      53,
      50,
      47, // Back left column (reversed)
      29,
      32,
      35, // Down right column
      20,
      23,
      26, // Front right column
    ],
  },

  // LEFT (L) rotation: affects left column of Up, Front, Down, Back
  // Clockwise: Up left col → Back right col (reversed) → Down left col → Front left col → Up left col
  [FACES.LEFT]: {
    clockwise: [
      0,
      3,
      6, // Up left column
      45,
      48,
      51, // Back right column (reversed)
      27,
      30,
      33, // Down left column
      18,
      21,
      24, // Front left column
    ],
    counterClockwise: [
      0,
      3,
      6, // Up left column
      18,
      21,
      24, // Front left column
      27,
      30,
      33, // Down left column
      45,
      48,
      51, // Back right column (reversed)
    ],
  },

  // FRONT (F) rotation: affects Front face and adjacent rows/columns
  // Clockwise: Up bottom row → Right left col → Down top row → Left right col → Up bottom row
  [FACES.FRONT]: {
    clockwise: [
      6,
      7,
      8, // Up bottom row
      9,
      12,
      15, // Right left column
      27,
      28,
      29, // Down top row
      44,
      41,
      38, // Left right column (reversed)
    ],
    counterClockwise: [
      6,
      7,
      8, // Up bottom row
      44,
      41,
      38, // Left right column (reversed)
      27,
      28,
      29, // Down top row
      9,
      12,
      15, // Right left column
    ],
  },

  // BACK (B) rotation: affects Back face and adjacent rows/columns
  // Clockwise: Up top row → Left left col → Down bottom row → Right right col → Up top row
  [FACES.BACK]: {
    clockwise: [
      0,
      1,
      2, // Up top row
      36,
      39,
      42, // Left left column
      33,
      34,
      35, // Down bottom row
      17,
      14,
      11, // Right right column (reversed)
    ],
    counterClockwise: [
      0,
      1,
      2, // Up top row
      17,
      14,
      11, // Right right column (reversed)
      33,
      34,
      35, // Down bottom row
      36,
      39,
      42, // Left left column
    ],
  },
});

// Correct the DOWN rotation cycles (I had wrong indices above)
const CORRECTED_ROTATION_CYCLES = Object.freeze({
  [FACES.DOWN]: {
    clockwise: [
      24,
      25,
      26, // Front bottom row
      15,
      16,
      17, // Right bottom row
      51,
      52,
      53, // Back bottom row
      42,
      43,
      44, // Left bottom row
    ],
    counterClockwise: [
      24,
      25,
      26, // Front bottom row
      42,
      43,
      44, // Left bottom row
      51,
      52,
      53, // Back bottom row
      15,
      16,
      17, // Right bottom row
    ],
  },
});

// Merge the corrected cycles
const FINAL_ROTATION_CYCLES = Object.freeze({
  [FACES.UP]: ROTATION_CYCLES[FACES.UP],
  [FACES.DOWN]: CORRECTED_ROTATION_CYCLES[FACES.DOWN],
  [FACES.RIGHT]: ROTATION_CYCLES[FACES.RIGHT],
  [FACES.LEFT]: ROTATION_CYCLES[FACES.LEFT],
  [FACES.FRONT]: ROTATION_CYCLES[FACES.FRONT],
  [FACES.BACK]: ROTATION_CYCLES[FACES.BACK],
});

// ============================================================================
// CUBE STATE CLASS
// ============================================================================
class RubiksCube {
  /**
   * Creates a new Rubik's Cube instance
   * @param {Array<string>} initialState - Optional initial state array (54 elements)
   */
  constructor(initialState = null) {
    // Create a copy of the state to avoid reference sharing
    this.state = initialState
      ? [...initialState]
      : this.initializeSolvedState();
  }

  /**
   * Initializes the cube to a solved state
   * @returns {Array<string>} The solved state array (54 elements)
   */
  initializeSolvedState() {
    return [...SOLVED_STATE];
  }

  /**
   * Gets the color at a specific index
   * @param {number} index - Index in the 1D array (0-53)
   * @returns {string} Color at the specified index
   */
  getColor(index) {
    if (index < 0 || index >= 54) {
      throw new Error(`Index out of bounds: ${index}. Must be 0-53.`);
    }
    return this.state[index];
  }

  /**
   * Sets the color at a specific index
   * @param {number} index - Index in the 1D array (0-53)
   * @param {string} color - Color to set
   */
  setColor(index, color) {
    if (index < 0 || index >= 54) {
      throw new Error(`Index out of bounds: ${index}. Must be 0-53.`);
    }
    this.state[index] = color;
  }

  /**
   * Gets all stickers for a specific face
   * @param {string} face - Face identifier (U, R, F, D, L, B)
   * @returns {Array<string>} Array of 9 colors for the face
   */
  getFace(face) {
    const indices = FACE_INDICES[face];
    if (!indices) {
      throw new Error(`Invalid face: ${face}`);
    }
    return this.state.slice(indices.start, indices.end + 1);
  }

  /**
   * Returns a deep copy of the current state
   * @returns {Array<string>} Copy of the state array
   */
  getStateCopy() {
    return [...this.state];
  }

  /**
   * Checks if the cube is in a solved state
   * @returns {boolean} True if solved, false otherwise
   */
  isSolved() {
    for (let i = 0; i < 54; i++) {
      if (this.state[i] !== SOLVED_STATE[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generates a string representation of the cube state
   * Useful for hashing in graph traversal algorithms
   * @returns {string} String representation of the state
   */
  toString() {
    return this.state.join("");
  }

  /**
   * Creates a hash of the cube state for efficient comparison
   * @returns {number} Numeric hash of the state
   */
  hash() {
    // Simple hash function for state comparison
    let hash = 0;
    for (let i = 0; i < 54; i++) {
      const charCode = this.state[i].charCodeAt(0);
      hash = (hash << 5) - hash + charCode;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Checks if two cube states are equal
   * @param {RubiksCube} other - Another cube instance
   * @returns {boolean} True if states are equal
   */
  equals(other) {
    if (!(other instanceof RubiksCube)) {
      return false;
    }
    for (let i = 0; i < 54; i++) {
      if (this.state[i] !== other.state[i]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Applies a rotation to the cube and returns a new cube instance
   * The original state is NOT mutated
   * @param {string} face - Face to rotate (U, D, L, R, F, B)
   * @param {number} direction - Direction (DIRECTION.CLOCKWISE or DIRECTION.COUNTER_CLOCKWISE)
   * @returns {RubiksCube} New cube instance with the rotation applied
   */
  rotate(face, direction = DIRECTION.CLOCKWISE) {
    // Create a copy of the current state
    const newState = [...this.state];

    // Get the face index range
    const faceIndices = FACE_INDICES[face];
    if (!faceIndices) {
      throw new Error(`Invalid face: ${face}`);
    }

    // Step 1: Rotate the face itself (9 stickers)
    const faceStart = faceIndices.start;
    const rotation =
      direction === DIRECTION.CLOCKWISE ? FACE_ROTATION_CW : FACE_ROTATION_CCW;

    // Create a temporary array for the face rotation
    const faceColors = newState.slice(faceStart, faceStart + 9);
    const rotatedFace = new Array(9);

    for (let i = 0; i < 9; i++) {
      rotatedFace[i] = faceColors[rotation[i]];
    }

    // Apply the rotated face back to the new state
    for (let i = 0; i < 9; i++) {
      newState[faceStart + i] = rotatedFace[i];
    }

    // Step 2: Cycle the adjacent rows/columns
    const cycles = FINAL_ROTATION_CYCLES[face];
    const cycle =
      direction === DIRECTION.CLOCKWISE
        ? cycles.clockwise
        : cycles.counterClockwise;

    // The cycle array has 12 indices (4 groups of 3)
    // For clockwise: group 0 → group 1, group 1 → group 2, group 2 → group 3, group 3 → group 0
    // For counter-clockwise: group 0 → group 3, group 3 → group 2, group 2 → group 1, group 1 → group 0

    const groupSize = 3;
    const numGroups = 4;

    // Extract the current colors from all groups
    const groups = [];
    for (let i = 0; i < numGroups; i++) {
      const groupStart = i * groupSize;
      const groupEnd = groupStart + groupSize;
      groups.push(
        newState.slice(cycle[groupStart], cycle[groupStart] + groupSize),
      );
    }

    // Determine the shift based on direction
    const shift = direction === DIRECTION.CLOCKWISE ? 1 : -1;

    // Apply the cyclic shift
    for (let i = 0; i < numGroups; i++) {
      const sourceGroupIndex = (i - shift + numGroups) % numGroups;
      const destGroupStart = i * groupSize;

      for (let j = 0; j < groupSize; j++) {
        newState[cycle[destGroupStart + j]] = groups[sourceGroupIndex][j];
      }
    }

    // Return a new cube instance with the rotated state
    return new RubiksCube(newState);
  }
}

// ============================================================================
// BFS SOLVER ALGORITHM (Standard)
// ============================================================================
/**
 * Solves a Rubik's Cube using Breadth-First Search
 * @param {Array<string>} scrambledState - 54-element array representing scrambled cube
 * @param {number} maxDepth - Maximum search depth (default: 7 for performance)
 * @returns {Array<string>} Array of moves to solve the cube (e.g., ['U', 'R', 'F'])
 */
function solveCubeBFS(scrambledState, maxDepth = 7) {
  // All possible moves (6 faces, clockwise only for simplicity)
  const MOVES = [
    FACES.UP,
    FACES.DOWN,
    FACES.LEFT,
    FACES.RIGHT,
    FACES.FRONT,
    FACES.BACK,
  ];

  // Create initial cube from scrambled state
  const initialCube = new RubiksCube(scrambledState);

  // Check if already solved
  if (initialCube.isSolved()) {
    return [];
  }

  // BFS queue: each element is { cube: RubiksCube, moves: Array<string> }
  const queue = [{ cube: initialCube, moves: [] }];

  // Visited states Set to prevent cycles
  const visited = new Set();
  visited.add(initialCube.toString());

  let iterations = 0;
  const MAX_ITERATIONS = 50000; // Safety limit to prevent browser freeze

  while (queue.length > 0) {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      console.warn(
        `BFS stopped at ${iterations} iterations (depth limit reached)`,
      );
      return null; // Failed to find solution within limits
    }

    // Dequeue the first element
    const { cube, moves } = queue.shift();

    // Check if we've exceeded max depth
    if (moves.length >= maxDepth) {
      continue;
    }

    // Generate all possible next states
    for (const move of MOVES) {
      // Apply the move
      const nextCube = cube.rotate(move, DIRECTION.CLOCKWISE);
      const nextMoves = [...moves, move];

      // Check if solved
      if (nextCube.isSolved()) {
        console.log(
          `Standard BFS: Solution found in ${nextMoves.length} moves after ${iterations} iterations`,
        );
        return nextMoves;
      }

      // Check if already visited
      const stateKey = nextCube.toString();
      if (!visited.has(stateKey)) {
        visited.add(stateKey);
        queue.push({ cube: nextCube, moves: nextMoves });
      }
    }
  }

  console.warn(`No solution found within ${maxDepth} moves`);
  return null; // No solution found within depth limit
}

// ============================================================================
// BIDIRECTIONAL BFS SOLVER ALGORITHM
// ============================================================================
/**
 * Inverts a move (e.g., 'U' becomes 'U'' which is counter-clockwise)
 * @param {string} move - Move to invert
 * @returns {string} Inverted move notation
 */
function invertMove(move) {
  return move + "'";
}

/**
 * Solves a Rubik's Cube using Bidirectional Breadth-First Search
 * Searches from both scrambled state and solved state simultaneously
 * @param {Array<string>} scrambledState - 54-element array representing scrambled cube
 * @param {number} maxDepth - Maximum search depth per direction (default: 10)
 * @returns {Array<string>} Array of moves to solve the cube
 */
function solveCubeBidirectionalBFS(scrambledState, maxDepth = 10) {
  // All possible moves (6 faces, clockwise only)
  const MOVES = [
    FACES.UP,
    FACES.DOWN,
    FACES.LEFT,
    FACES.RIGHT,
    FACES.FRONT,
    FACES.BACK,
  ];

  // Create initial cubes
  const forwardCube = new RubiksCube(scrambledState);
  const backwardCube = new RubiksCube(SOLVED_STATE);

  // Check if already solved
  if (forwardCube.isSolved()) {
    return [];
  }

  // Forward queue: from scrambled state
  // Each element: { cube: RubiksCube, moves: Array<string> }
  const forwardQueue = [{ cube: forwardCube, moves: [] }];
  const forwardVisited = new Map();
  forwardVisited.set(forwardCube.toString(), []);

  // Backward queue: from solved state
  const backwardQueue = [{ cube: backwardCube, moves: [] }];
  const backwardVisited = new Map();
  backwardVisited.set(backwardCube.toString(), []);

  let iterations = 0;
  const MAX_ITERATIONS = 100000; // Higher limit for bidirectional search

  while (forwardQueue.length > 0 && backwardQueue.length > 0) {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      console.warn(
        `Bidirectional BFS stopped at ${iterations} iterations (depth limit reached)`,
      );
      return null;
    }

    // Alternate between forward and backward expansion
    const expandForward = iterations % 2 === 0;

    if (expandForward) {
      // Expand forward queue
      const { cube, moves } = forwardQueue.shift();

      if (moves.length >= maxDepth) {
        continue;
      }

      for (const move of MOVES) {
        const nextCube = cube.rotate(move, DIRECTION.CLOCKWISE);
        const nextMoves = [...moves, move];
        const stateKey = nextCube.toString();

        // Check for collision with backward search
        if (backwardVisited.has(stateKey)) {
          const backwardMoves = backwardVisited.get(stateKey);
          // Reconstruct full path: forward moves + inverted backward moves
          const fullSolution = [
            ...nextMoves,
            ...backwardMoves.map(invertMove).reverse(),
          ];
          console.log(
            `Bidirectional BFS: Collision found! Solution length: ${fullSolution.length} moves after ${iterations} iterations`,
          );
          return fullSolution;
        }

        // Add to forward visited if not already there
        if (!forwardVisited.has(stateKey)) {
          forwardVisited.set(stateKey, nextMoves);
          forwardQueue.push({ cube: nextCube, moves: nextMoves });
        }
      }
    } else {
      // Expand backward queue
      const { cube, moves } = backwardQueue.shift();

      if (moves.length >= maxDepth) {
        continue;
      }

      for (const move of MOVES) {
        const nextCube = cube.rotate(move, DIRECTION.CLOCKWISE);
        const nextMoves = [...moves, move];
        const stateKey = nextCube.toString();

        // Check for collision with forward search
        if (forwardVisited.has(stateKey)) {
          const forwardMoves = forwardVisited.get(stateKey);
          // Reconstruct full path: forward moves + inverted backward moves
          const fullSolution = [
            ...forwardMoves,
            ...nextMoves.map(invertMove).reverse(),
          ];
          console.log(
            `Bidirectional BFS: Collision found! Solution length: ${fullSolution.length} moves after ${iterations} iterations`,
          );
          return fullSolution;
        }

        // Add to backward visited if not already there
        if (!backwardVisited.has(stateKey)) {
          backwardVisited.set(stateKey, nextMoves);
          backwardQueue.push({ cube: nextCube, moves: nextMoves });
        }
      }
    }
  }

  console.warn(`No solution found within ${maxDepth} moves per direction`);
  return null;
}

// ============================================================================
// EXPORT FOR MODULE USE (if needed)
// ============================================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COLORS,
    FACES,
    FACE_INDICES,
    SOLVED_STATE,
    DIRECTION,
    RubiksCube,
    solveCubeBFS,
    solveCubeBidirectionalBFS,
  };
}

// ============================================================================
// INITIALIZE AND EXPORT TO GLOBAL SCOPE FOR BROWSER USE
// ============================================================================
if (typeof window !== "undefined") {
  window.RubiksCube = RubiksCube;
  window.CUBE_CONSTANTS = {
    COLORS,
    FACES,
    FACE_INDICES,
    SOLVED_STATE,
    DIRECTION,
  };
  window.solveCubeBFS = solveCubeBFS;
  window.solveCubeBidirectionalBFS = solveCubeBidirectionalBFS;

  // ============================================================================
  // FRONTEND INTERACTIVE UI (Step 5 & 6)
  // ============================================================================
  let activeCube = new RubiksCube();
  let selectedColor = "W"; // Default selected color is White (W)
  let isSolving = false; // Flag to check if solver animation is running

  // Helper to update status message box
  function updateStatus(text, type = "ready") {
    const statusMessage = document.getElementById("status-message");
    if (!statusMessage) return;
    statusMessage.textContent = text;
    statusMessage.className = `status-message status-${type}`;
  }

  // Helper to enable/disable UI controls during animation
  function setControlsDisabled(disabled) {
    const buttons = document.querySelectorAll(".btn, .palette-btn");
    buttons.forEach((btn) => {
      btn.disabled = disabled;
      if (disabled) {
        btn.classList.add("disabled");
      } else {
        btn.classList.remove("disabled");
      }
    });

    const stickers = document.querySelectorAll(".sticker");
    stickers.forEach((sticker) => {
      if (disabled) {
        sticker.style.pointerEvents = "none";
        sticker.style.opacity = "0.75";
      } else {
        sticker.style.pointerEvents = "auto";
        sticker.style.opacity = "1";
      }
    });
  }

  // Helper to draw the moves in the solution bar
  function displaySolutionMoves(moves) {
    const solutionDisplay = document.getElementById("solution-display");
    const movesContainer = document.getElementById("moves-container");
    if (!solutionDisplay || !movesContainer) return;

    movesContainer.innerHTML = "";

    if (!moves || moves.length === 0) {
      solutionDisplay.classList.add("hidden");
      return;
    }

    moves.forEach((move, index) => {
      const pill = document.createElement("div");
      pill.className = "move-pill";
      pill.setAttribute("data-move-index", index);
      pill.textContent = move;
      movesContainer.appendChild(pill);
    });

    solutionDisplay.classList.remove("hidden");
  }

  // Render the current cube state to the HTML grid
  function renderCube() {
    const stickers = document.querySelectorAll(".sticker");
    stickers.forEach((sticker) => {
      const index = parseInt(sticker.getAttribute("data-index"), 10);
      const colorChar = activeCube.getColor(index);

      // Clean up previous sticker color classes
      sticker.className = "sticker";

      // Add the color class matching the state
      if (colorChar) {
        sticker.classList.add(`sticker-${colorChar.toLowerCase()}`);
      }
    });
  }

  // Scramble implementation: Apply 15-20 random valid moves to a solved state
  function scrambleCube() {
    if (isSolving) return;

    activeCube = new RubiksCube(); // Start fresh from solved state
    const faces = Object.values(FACES);
    const directions = [DIRECTION.CLOCKWISE, DIRECTION.COUNTER_CLOCKWISE];
    const scrambleLength = Math.floor(Math.random() * 6) + 15; // 15 to 20 random rotations

    displaySolutionMoves([]); // Hide previous solutions
    updateStatus("Scrambling...", "info");

    for (let i = 0; i < scrambleLength; i++) {
      const randomFace = faces[Math.floor(Math.random() * faces.length)];
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];
      activeCube = activeCube.rotate(randomFace, randomDirection);
    }

    renderCube();
    updateStatus(`Cube scrambled with ${scrambleLength} random moves. Ready to solve!`, "ready");
  }

  // Solve triggering: Run Bidirectional BFS on current state
  function solveCube() {
    if (isSolving) return;

    if (activeCube.isSolved()) {
      updateStatus("Cube is already solved!", "success");
      displaySolutionMoves([]);
      return;
    }

    updateStatus("Solving (running Bidirectional BFS)...", "info");
    setControlsDisabled(true);
    isSolving = true;

    // setTimeout allows DOM painting of status message before locking thread
    setTimeout(() => {
      try {
        const stateCopy = activeCube.getStateCopy();
        const startTime = performance.now();
        // Max depth 6 per direction = max 12 moves path. Extremely fast search space
        const solution = solveCubeBidirectionalBFS(stateCopy, 6);
        const endTime = performance.now();
        const duration = (endTime - startTime).toFixed(0);

        if (solution === null) {
          updateStatus("No solution found within search depth (max 12 moves). Try manually painting it.", "error");
          setControlsDisabled(false);
          isSolving = false;
          return;
        }

        updateStatus(`Solution found in ${solution.length} moves (${duration}ms)! Animating...`, "success");
        displaySolutionMoves(solution);

        // Run animation loop
        playSolutionAnimation(solution);
      } catch (err) {
        console.error(err);
        updateStatus("An error occurred during solving.", "error");
        setControlsDisabled(false);
        isSolving = false;
      }
    }, 50);
  }

  // Animation Loop: Apply one move from solution every 500ms
  function playSolutionAnimation(solution) {
    let moveIndex = 0;

    function nextStep() {
      if (moveIndex >= solution.length) {
        // Animation finished
        updateStatus("Cube solved successfully!", "success");
        // Fade out move pill highlights after animation completion
        setTimeout(() => {
          document.querySelectorAll(".move-pill").forEach((p) => p.classList.remove("active"));
        }, 1000);
        setControlsDisabled(false);
        isSolving = false;
        return;
      }

      // Highlight the active move pill and scroll horizontally if overflowing
      const pills = document.querySelectorAll(".move-pill");
      pills.forEach((pill, idx) => {
        if (idx === moveIndex) {
          pill.classList.add("active");
          pill.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        } else {
          pill.classList.remove("active");
        }
      });

      const move = solution[moveIndex];
      // Apply the move to activeCube state model
      if (move.endsWith("'")) {
        const baseMove = move[0];
        activeCube = activeCube.rotate(baseMove, DIRECTION.COUNTER_CLOCKWISE);
      } else {
        activeCube = activeCube.rotate(move, DIRECTION.CLOCKWISE);
      }

      renderCube();
      moveIndex++;
      setTimeout(nextStep, 500); // 500ms delay between steps
    }

    nextStep();
  }

  // Bind UI interactions
  function initInteractiveUI() {
    const stickers = document.querySelectorAll(".sticker");
    const paletteButtons = document.querySelectorAll(".palette-btn");
    const scrambleBtn = document.getElementById("scramble-btn");
    const solveBtn = document.getElementById("solve-btn");
    const resetBtn = document.getElementById("reset-btn");

    // Click handler for stickers: Paint sticker with selected color
    stickers.forEach((sticker) => {
      sticker.addEventListener("click", () => {
        if (isSolving) return;
        const index = parseInt(sticker.getAttribute("data-index"), 10);
        activeCube.setColor(index, selectedColor);
        renderCube();
        updateStatus("Painted a sticker. Ready to solve!", "ready");
      });
    });

    // Click handler for color palette: Update selected color
    paletteButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isSolving) return;
        paletteButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        selectedColor = btn.getAttribute("data-color");
      });
    });

    // Click handler for scramble button: Scramble cube
    if (scrambleBtn) {
      scrambleBtn.addEventListener("click", scrambleCube);
    }

    // Click handler for solve button: Solve cube
    if (solveBtn) {
      solveBtn.addEventListener("click", solveCube);
    }

    // Click handler for reset button: Reset to solved state
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (isSolving) return;
        activeCube = new RubiksCube();
        displaySolutionMoves([]);
        renderCube();
        updateStatus("Cube reset to solved state. Ready to edit or scramble!", "ready");
      });
    }

    // Initial render of solved state
    renderCube();
  }

  // Run initialization when DOM is loaded or if already loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInteractiveUI);
  } else {
    initInteractiveUI();
  }

  // Export active cube and render functions for console/solver control
  window.activeCube = activeCube;
  window.renderCube = renderCube;
}

// ============================================================================
// DEMO: Initialize a solved cube and test rotation
// ============================================================================
console.log("Rubik's Cube Solver - State Management Initialized");
console.log("==============================================");

// Create a solved cube
const solvedCube = new RubiksCube();
console.log("Initial solved state:");
console.log(solvedCube.toString());
console.log("Is solved:", solvedCube.isSolved());

// Test: Apply one Right (R) clockwise rotation
console.log("\n--- Testing Right (R) Clockwise Rotation ---");
const rotatedCube = solvedCube.rotate(FACES.RIGHT, DIRECTION.CLOCKWISE);

console.log("State after R rotation:");
console.log(rotatedCube.toString());

// Verify the original cube was NOT mutated
console.log("\nOriginal cube still solved:", solvedCube.isSolved());
console.log("Original cube state:", solvedCube.toString());

// Show specific faces to verify the rotation
console.log("\n--- Face Comparison ---");
console.log("Right face before rotation:", solvedCube.getFace(FACES.RIGHT));
console.log("Right face after rotation:", rotatedCube.getFace(FACES.RIGHT));
console.log("Up face before rotation:", solvedCube.getFace(FACES.UP));
console.log("Up face after rotation:", rotatedCube.getFace(FACES.UP));
console.log("Front face before rotation:", solvedCube.getFace(FACES.FRONT));
console.log("Front face after rotation:", rotatedCube.getFace(FACES.FRONT));
console.log("Down face before rotation:", solvedCube.getFace(FACES.DOWN));
console.log("Down face after rotation:", rotatedCube.getFace(FACES.DOWN));
console.log("Back face before rotation:", solvedCube.getFace(FACES.BACK));
console.log("Back face after rotation:", rotatedCube.getFace(FACES.BACK));

// ============================================================================
// DEMO: BFS Solver Test (3 moves)
// ============================================================================
console.log("\n==============================================");
console.log("Standard BFS Solver Test (3-move scramble)");
console.log("==============================================");

// Scramble the cube with 3 known moves
console.log("\nScrambling cube with 3 moves: R, U, F");
const scrambledCube3 = solvedCube
  .rotate(FACES.RIGHT, DIRECTION.CLOCKWISE)
  .rotate(FACES.UP, DIRECTION.CLOCKWISE)
  .rotate(FACES.FRONT, DIRECTION.CLOCKWISE);

console.log("Scrambled state:");
console.log(scrambledCube3.toString());
console.log("Is solved:", scrambledCube3.isSolved());

// Run standard BFS to solve it
console.log("\nRunning standard BFS solver...");
const startTime1 = performance.now();
const solution1 = solveCubeBFS(scrambledCube3.getStateCopy(), 4);
const endTime1 = performance.now();

if (solution1) {
  console.log(`\n✓ Solution found: ${solution1.join(" → ")}`);
  console.log(`Number of moves: ${solution1.length}`);
  console.log(`Time taken: ${(endTime1 - startTime1).toFixed(2)}ms`);

  // Verify the solution by applying it
  console.log("\nVerifying solution...");
  let verificationCube1 = new RubiksCube(scrambledCube3.getStateCopy());
  for (const move of solution1) {
    verificationCube1 = verificationCube1.rotate(move, DIRECTION.CLOCKWISE);
  }
  console.log(
    "Cube solved after applying solution:",
    verificationCube1.isSolved(),
  );
} else {
  console.log("\n✗ No solution found within depth limit");
  console.log(`Time taken: ${(endTime1 - startTime1).toFixed(2)}ms`);
}

// ============================================================================
// DEMO: Bidirectional BFS vs Standard BFS (7-move scramble)
// ============================================================================
console.log("\n==============================================");
console.log("Bidirectional BFS vs Standard BFS Comparison");
console.log("==============================================");

// Scramble the cube with 7 moves
console.log("\nScrambling cube with 7 moves: R, U, F, D, L, B, R");
const scrambledCube7 = solvedCube
  .rotate(FACES.RIGHT, DIRECTION.CLOCKWISE)
  .rotate(FACES.UP, DIRECTION.CLOCKWISE)
  .rotate(FACES.FRONT, DIRECTION.CLOCKWISE)
  .rotate(FACES.DOWN, DIRECTION.CLOCKWISE)
  .rotate(FACES.LEFT, DIRECTION.CLOCKWISE)
  .rotate(FACES.BACK, DIRECTION.CLOCKWISE)
  .rotate(FACES.RIGHT, DIRECTION.CLOCKWISE);

console.log("Scrambled state:");
console.log(scrambledCube7.toString());
console.log("Is solved:", scrambledCube7.isSolved());

// Test standard BFS
console.log("\n--- Standard BFS ---");
const startTimeStd = performance.now();
const solutionStd = solveCubeBFS(scrambledCube7.getStateCopy(), 8);
const endTimeStd = performance.now();

if (solutionStd) {
  console.log(`✓ Solution found: ${solutionStd.join(" → ")}`);
  console.log(`Number of moves: ${solutionStd.length}`);
  console.log(`Time taken: ${(endTimeStd - startTimeStd).toFixed(2)}ms`);
} else {
  console.log(`✗ No solution found within depth limit`);
  console.log(`Time taken: ${(endTimeStd - startTimeStd).toFixed(2)}ms`);
}

// Test bidirectional BFS
console.log("\n--- Bidirectional BFS ---");
const startTimeBi = performance.now();
const solutionBi = solveCubeBidirectionalBFS(scrambledCube7.getStateCopy(), 6);
const endTimeBi = performance.now();

if (solutionBi) {
  console.log(`✓ Solution found: ${solutionBi.join(" → ")}`);
  console.log(`Number of moves: ${solutionBi.length}`);
  console.log(`Time taken: ${(endTimeBi - startTimeBi).toFixed(2)}ms`);

  // Verify the solution by applying it
  console.log("\nVerifying bidirectional solution...");
  let verificationCubeBi = new RubiksCube(scrambledCube7.getStateCopy());
  for (const move of solutionBi) {
    // Handle inverted moves (e.g., U')
    if (move.endsWith("'")) {
      const baseMove = move[0];
      verificationCubeBi = verificationCubeBi.rotate(
        baseMove,
        DIRECTION.COUNTER_CLOCKWISE,
      );
    } else {
      verificationCubeBi = verificationCubeBi.rotate(move, DIRECTION.CLOCKWISE);
    }
  }
  console.log(
    "Cube solved after applying solution:",
    verificationCubeBi.isSolved(),
  );

  // Performance comparison
  console.log("\n--- Performance Comparison ---");
  if (solutionStd) {
    const speedup = (
      (endTimeStd - startTimeStd) /
      (endTimeBi - startTimeBi)
    ).toFixed(2);
    console.log(`Bidirectional BFS is ${speedup}x faster than standard BFS`);
  }
} else {
  console.log(`✗ No solution found within depth limit`);
  console.log(`Time taken: ${(endTimeBi - startTimeBi).toFixed(2)}ms`);
}
